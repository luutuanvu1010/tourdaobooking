# Thông tin chuyến đi theo từng dịch vụ — Kế hoạch thi công A1 (nền dữ liệu + API)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đơn hàng lưu thông tin chuyến (ngày giờ khởi hành, đón, check-in, ghi chú) và số khách theo loại cho TỪNG dịch vụ; máy chủ tự sinh dòng tiền; xác nhận đơn đòi đủ chuyến; đơn đã xác nhận vẫn sửa được trường vận hành. Đây là giai đoạn **A1** (dữ liệu + luật + API + e2e), chưa có giao diện.

**Architecture:** Bảng mới `order_service` (migration 0008) giữ khách + chuyến, `order_item` trỏ về nó (`service_id`, `catalog_price`, `pax_code`). Luật thuần nằm ở `orders/rules.ts` + `orders/service-rules.ts` (có unit test); SQL ở `orders/repository.ts` với điều kiện tranh chấp nằm TRONG câu SQL; lớp lưới thứ hai là trigger SQL. Module `orders` lấy giá hiệu lực của danh mục qua hàm công khai `getEffectiveServices` của `catalog/index.ts`.

**Tech Stack:** Cloudflare Workers + D1 (SQLite), TypeScript (Node 22 `node --test` chạy thẳng `.ts`), `wrangler dev` cho e2e, `node:sqlite` cho test SQL. Không thêm thư viện.

**Spec:** `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (bản 2, chủ dự án đã duyệt 2026-09-19). Các sai khác nhỏ so với spec phát sinh khi thi công được ghi ở Task 9 và cập nhật ngược vào spec.

## Global Constraints

- Migration mới bắt đầu từ `0008`; chỉ thêm file mới, không sửa file đã có (ARCHITECTURE "Luật dữ liệu"). **Không áp migration remote, không deploy** — chủ dự án tự chạy.
- Tiền là `INTEGER` VNĐ; số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server. Dòng tiền của dịch vụ danh mục do **máy chủ** sinh bằng `buildLines`; trình duyệt không gửi được số lượng.
- `CHECK` trong SQL chỉ cho bất biến không đổi (khuôn dạng ngày/giờ, số khách ≥ 0). Trần 50 khách là hằng `MAX_GUESTS_PER_SERVICE` trong `src/shared/order-lines.ts` — một nguồn duy nhất.
- Ngày `YYYY-MM-DD`, giờ `HH:MM` theo **giờ Việt Nam**. "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; **không dùng `date('now')`** (UTC).
- Điều kiện tranh chấp nằm trong chính câu SQL. Mọi câu ghi đứng sau `UPDATE orders` đầu tiên của một batch mang `wonGuard` (dòng nhật ký có id riêng của request).
- Chuỗi tự do (`pickup_place`, `checkin_place`, `note`): bỏ ký tự điều khiển. **Nhật ký không ghi giá trị của chúng** (chỉ ghi "đổi điểm đón…").
- Module khác chỉ import `index.ts` của module đó; `src/shared/` không import `src/modules/`. File thuần (`rules.ts`, `service-rules.ts`, `fields.ts`, `shared/*`) import bằng đuôi `.ts`; file có I/O import không đuôi.
- Thông báo cho người dùng bằng tiếng Việt đầy đủ dấu; định danh/mã lỗi giữ nguyên tiếng Anh (`catalog_changed`, `incomplete_trip`, `stale`…).
- **Ngoài phạm vi A1:** giao diện (A2: `web/order-form.ts`, `web/order.ts`), cột/lọc ngày ở danh sách (A3: `nextDepartDate`, `?depart=`), vai trò Guide (phần B), mùa vụ/coupon.
- Sau Task 8, `npx tsc --noEmit -p web` **vỡ 4 lỗi** ở `web/order-form.ts` và `web/order.ts` (chúng đọc `items`/`OrderInput.items` cũ). Đó là phạm vi A2; **A1 và A2 phải cùng xong trước khi merge/deploy**. Không sửa web trong A1.

## Cấu trúc file

| File | Việc | Task |
|---|---|---|
| `src/shared/vn-date.ts` (+ `.test.ts`) | mới — ngày giờ Việt Nam thuần | 1 |
| `src/shared/order-lines.ts` (+ test) | sửa — trần 50 khách, đếm khách, `buildLines` nhận đơn giá thực tế, `priceDeviation`, `EffectiveService` | 2 |
| `migrations/0008_order_service.sql`, `src/modules/orders/migration.test.ts` | mới — bảng, cột, trigger, backfill + test SQL | 3 |
| `src/modules/catalog/rules.ts` (+ test), `catalog/index.ts` | sửa — `toEffective`, `getEffectiveServices` | 4 |
| `src/modules/orders/fields.ts`, `service-rules.ts` (+ test), `shared/contracts.ts` (thêm kiểu), `shared/audit-actions.ts` | mới/sửa — luật một dịch vụ | 5 |
| `src/modules/orders/rules.ts` (+ test), `orders/index.ts` (shim tạm) | sửa — `validateOrder(input, ctx)` | 6 |
| `tests/e2e/lib.mjs`, `orders.mjs`, `platform.mjs`, `trip.mjs`, `run.mjs` | sửa/mới — e2e viết trước (ĐỎ) | 7 |
| `shared/contracts.ts` (đổi kiểu cũ), `audit/repository.ts`, `orders/repository.ts`, `orders/service.ts`, `orders/index.ts` | sửa/mới — ghi dữ liệu + route (XANH) | 8 |
| `order-lines.ts`, `fields.ts` (+ 3 file test) | sửa — dịch vụ nhóm từ chối khách loại khác; bỏ U+2028/2029 + ký tự điều hướng hai chiều | 8b |
| `docs/SPEC-tourdao-sales.md`, `ARCHITECTURE.md`, `HANDOFF-M4.md`, `tests/e2e/README.md`, spec thông tin chuyến | sửa — đồng bộ tài liệu với mã | 9 |

## Chuẩn bị (một lần)

Chạy trong worktree `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/thong-tin-chuyen-di` (nhánh `worktree-thong-tin-chuyen-di`). Cần Node ≥ 22.13 (`node:sqlite` không cần cờ; máy hiện có 22.22).

- [ ] **Bước 1: Dùng chung `node_modules` của checkout gốc** (worktree chưa có; `node_modules` đã nằm trong `.gitignore`)

```bash
ln -s /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/node_modules node_modules
```

- [ ] **Bước 2: Xác nhận nền xanh trước khi sửa**

```bash
npm test
npx tsc --noEmit && npx tsc --noEmit -p web
```

Expected: `# tests 45`, `# pass 45`, `# fail 0`; hai lệnh `tsc` không in lỗi.

---
### Task 1: Ngày giờ theo giờ Việt Nam (`src/shared/vn-date.ts`)

**Files:**
- Create: `src/shared/vn-date.ts`
- Test: `src/shared/vn-date.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces (các task sau dựa vào):
  - `vnToday(now: Date): string` — ngày `YYYY-MM-DD` theo giờ Việt Nam.
  - `isISODate(s: string): boolean` — đúng khuôn dạng và đúng lịch.
  - `addDays(iso: string, days: number): string`.
  - `isHHMM(s: string): boolean` — `00:00`–`23:59`.

- [ ] **Bước 1: Viết test (ĐỎ)** — tạo `src/shared/vn-date.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { addDays, isHHMM, isISODate, vnToday } from "./vn-date.ts";

test("vnToday: ngày theo giờ Việt Nam, không phải UTC", () => {
  assert.equal(vnToday(new Date("2026-09-16T18:30:00Z")), "2026-09-17"); // 01:30 ngày 17 giờ VN
  assert.equal(vnToday(new Date("2026-09-16T16:59:59Z")), "2026-09-16"); // 23:59:59 ngày 16 giờ VN
  assert.equal(vnToday(new Date("2026-12-31T17:00:00Z")), "2027-01-01"); // qua năm
});

test("isISODate: đúng khuôn dạng và đúng lịch", () => {
  for (const ok of ["2026-09-20", "2028-02-29", "2026-12-31"]) assert.ok(isISODate(ok), ok);
  for (const bad of ["2026-02-30", "2027-02-29", "2026-13-01", "2026-9-2", "20/09/2026", "2026-09-20T00:00", "", " 2026-09-20", "2026-00-10"]) assert.ok(!isISODate(bad), bad);
});

test("addDays: qua tháng, qua năm, năm nhuận", () => {
  assert.equal(addDays("2026-09-19", 365), "2027-09-19");
  assert.equal(addDays("2027-12-31", 1), "2028-01-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-09-19", -19), "2026-08-31");
});

test("isHHMM: 00:00–23:59, đủ hai chữ số", () => {
  for (const ok of ["00:00", "07:30", "12:00", "23:59"]) assert.ok(isHHMM(ok), ok);
  for (const bad of ["24:00", "7:30", "07:60", "0730", "07:3", "", "07:30:00", "ab:cd"]) assert.ok(!isHHMM(bad), bad);
});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/shared/vn-date.test.ts
```

Expected: FAIL — `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/src/shared/vn-date.ts'`.

- [ ] **Bước 3: Cài đặt** — tạo `src/shared/vn-date.ts`

```ts
// Ngày giờ dân sự theo giờ Việt Nam (UTC+7, không có giờ mùa hè). Logic thuần, không I/O, một nguồn cho server và giao diện.
// Ngày = "YYYY-MM-DD", giờ = "HH:MM" (TEXT trong D1). KHÔNG dùng date('now') trong SQL cho "hôm nay": đó là UTC, sai ngày trong khoảng 00:00–07:00 giờ VN.

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày hiện tại theo giờ Việt Nam. */
export function vnToday(now: Date): string {
  return new Date(now.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Đúng khuôn dạng YYYY-MM-DD và đúng lịch (30/02 → sai). */
export function isISODate(s: string): boolean {
  if (!ISO_DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** Cộng/trừ ngày trên chuỗi ngày hợp lệ. */
export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** HH:MM từ 00:00 đến 23:59 (24:00 không hợp lệ). */
export const isHHMM = (s: string): boolean => TIME_RE.test(s);
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
node --test src/shared/vn-date.test.ts && npm test && npx tsc --noEmit
```

Expected: 4 test mới xanh; `npm test` tổng `# tests 49`, `# pass 49`; `tsc` không lỗi.

- [ ] **Bước 5: Commit**

```bash
git add src/shared/vn-date.ts src/shared/vn-date.test.ts
git commit -m "Thêm shared/vn-date: ngày giờ theo giờ Việt Nam, kiểm ngày đúng lịch" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 2: Sinh dòng tiền — trần 50 khách, đơn giá thực tế, lệch giá (`src/shared/order-lines.ts`)

**Files:**
- Modify: `src/shared/order-lines.ts` (thay toàn bộ nội dung)
- Test: `src/shared/order-lines.test.ts`

**Interfaces:**
- Consumes: không có (không phụ thuộc Task 1).
- Produces:
  - `MAX_GUESTS_PER_SERVICE = 50` (thay `MAX_COUNT = 100_000` không export trước đây).
  - `type PaxCounts = Record<PaxCode, number>`; `interface EffectiveService extends CatalogService { visible: boolean }`.
  - `paxTotal(pax): number`, `payingGuests(pax): number` (trừ em bé), `priceDeviation({unitPrice, catalogPrice}): number | null`.
  - `buildLines(item, counts, unitPrices = {}): LinesResult` — dòng trả về có thêm `pax: PaxCode` và `catalogPrice: number`; `unitPrice` = `unitPrices[loại] ?? giá danh mục`.
  - Hành vi cũ giữ nguyên khi không truyền `unitPrices` (web hiện tại vẫn biên dịch).

- [ ] **Bước 1: Viết test (ĐỎ)** — sửa `src/shared/order-lines.test.ts`

```diff
--- a/src/shared/order-lines.test.ts
+++ b/src/shared/order-lines.test.ts
@@ -1,6 +1,6 @@
 import { test } from "node:test";
 import assert from "node:assert/strict";
-import { availableCodes, buildLines, parseUnit, type CatalogService } from "./order-lines.ts";
+import { MAX_GUESTS_PER_SERVICE, availableCodes, buildLines, parseUnit, paxTotal, payingGuests, priceDeviation, type CatalogService } from "./order-lines.ts";
 
 const tour: CatalogService = {
   code: "TD101",
@@ -67,3 +67,40 @@
   assert.deepEqual(availableCodes(banana), ["adult"]);
   assert.deepEqual(availableCodes({ ...tour, unit: "perGroup" }), []);
 });
+
+test("đơn giá thực tế: ghi đè từng loại, vẫn giữ giá danh mục và loại khách trên dòng", () => {
+  const r = buildLines(tour, { adult: 2, child: 1 }, { adult: 800000 });
+  assert.ok(r.ok);
+  assert.deepEqual(r.lines.map((l) => [l.pax, l.unitPrice, l.catalogPrice]), [
+    ["adult", 800000, 850000],
+    ["child", 595000, 595000], // không ghi đè → giá danh mục
+  ]);
+  const g = buildLines(banana, { adult: 7 }, { adult: 900000 });
+  assert.ok(g.ok);
+  assert.deepEqual([g.lines[0]!.pax, g.lines[0]!.quantity, g.lines[0]!.unitPrice, g.lines[0]!.catalogPrice], ["adult", 2, 900000, 1000000]);
+});
+
+test("trần khách mỗi dịch vụ: từng loại và tổng ≤ MAX_GUESTS_PER_SERVICE", () => {
+  assert.equal(MAX_GUESTS_PER_SERVICE, 50);
+  assert.ok(buildLines(tour, { adult: 50 }).ok);
+  assert.ok(buildLines(tour, { adult: 25, child: 20, senior: 5 }).ok);
+  assert.ok(!buildLines(tour, { adult: 51 }).ok);
+  const over = buildLines(tour, { adult: 30, child: 21 });
+  assert.ok(!over.ok);
+  assert.match((over as { message: string }).message, /Tối đa 50 khách/);
+  assert.ok(!buildLines(banana, { adult: 51 }).ok);
+});
+
+test("đếm khách: tổng và khách tính tiền (trừ em bé)", () => {
+  assert.equal(paxTotal({ adult: 2, child: 1, senior: 0, infant: 3 }), 6);
+  assert.equal(paxTotal({}), 0);
+  assert.equal(payingGuests({ adult: 2, child: 1, senior: 1, infant: 3 }), 4);
+  assert.equal(payingGuests({ infant: 2 }), 0);
+});
+
+test("lệch giá so với danh mục: dương/âm, null khi khớp hoặc nhập tay", () => {
+  assert.equal(priceDeviation({ unitPrice: 800000, catalogPrice: 850000 }), -50000);
+  assert.equal(priceDeviation({ unitPrice: 900000, catalogPrice: 850000 }), 50000);
+  assert.equal(priceDeviation({ unitPrice: 850000, catalogPrice: 850000 }), null);
+  assert.equal(priceDeviation({ unitPrice: 123, catalogPrice: null }), null);
+});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/shared/order-lines.test.ts
```

Expected: FAIL — `SyntaxError: The requested module './order-lines.ts' does not provide an export named 'MAX_GUESTS_PER_SERVICE'`.

- [ ] **Bước 3: Cài đặt** — thay toàn bộ `src/shared/order-lines.ts`

```ts
// Sinh dòng đơn hàng từ một dịch vụ trong danh mục (spec §2.4-6, HANDOFF-M3). Logic thuần, dùng chung cho giao diện và máy chủ.
// Khớp cách tính của module booking tourdaovn (quote.ts): khách chia 4 loại adult/child/senior/infant, mỗi loại có giá thì một dòng;
// dịch vụ tính theo nhóm (perNPax) nhập theo SỐ KHÁCH, số lượng dòng = ceil(số khách / cỡ nhóm) LƯỢT.

export type PaxCode = "adult" | "child" | "senior" | "infant";
export const PAX_ORDER: readonly PaxCode[] = ["adult", "child", "senior", "infant"];
export const PAX_LABEL: Record<PaxCode, string> = { adult: "Người lớn", child: "Trẻ em", senior: "Người cao tuổi", infant: "Em bé" };

export type Prices = Record<PaxCode, number | null>;
export type PaxCounts = Record<PaxCode, number>;

/** Trần mọi số tiền VNĐ (100 tỷ) — chặn số phi lý, giữ mọi phép cộng/nhân trong số nguyên an toàn. */
export const MAX_AMOUNT_VND = 100_000_000_000;

/** Trần số khách của MỘT dịch vụ trong đơn (tổng các loại). Nguồn duy nhất: luật máy chủ, `buildLines` và giao diện cùng dùng. */
export const MAX_GUESTS_PER_SERVICE = 50;

/** Dạng hợp lệ của "Mã tour" trong danh mục (Sheet → catalog_item.code → order_item.catalog_code). */
export const CATALOG_CODE_RE = /^[A-Za-z0-9._-]{1,40}$/;

export interface CatalogService {
  code: string;
  name: string;
  /** Chuỗi đơn vị của Sheet: "perPax", "per5Pax"… */
  unit: string;
  prices: Prices;
  notes: Record<Exclude<PaxCode, "adult">, string | null>;
}

/** Dịch vụ danh mục ở dạng bán được: giá hiệu lực (đã áp ghi đè của Admin) + đang hiện hay không (còn trong Sheet và không bị ẩn). */
export interface EffectiveService extends CatalogService {
  visible: boolean;
}

export type Unit = { kind: "perPax" } | { kind: "group"; size: number } | { kind: "unknown"; raw: string };

/** perPax → tính theo người; per5Pax (perNPax, N ≥ 2) → giá mỗi nhóm tối đa N khách; còn lại chưa hỗ trợ. */
export function parseUnit(raw: string): Unit {
  const unit = raw.trim();
  if (unit === "perPax") return { kind: "perPax" };
  const m = /^per(\d{1,3})Pax$/.exec(unit);
  if (m && Number(m[1]) >= 2) return { kind: "group", size: Number(m[1]) };
  return { kind: "unknown", raw: unit };
}

/** Loại khách hiện bộ đếm: theo người → mọi loại có giá; theo nhóm → chỉ "số khách" (adult); đơn vị lạ → không có. */
export function availableCodes(item: CatalogService): PaxCode[] {
  const unit = parseUnit(item.unit);
  if (unit.kind === "group") return item.prices.adult === null ? [] : ["adult"];
  if (unit.kind === "unknown") return [];
  return PAX_ORDER.filter((c) => item.prices[c] !== null);
}

/** Tổng số khách mọi loại. Dịch vụ chỉ một loại giá (giá chung/nhóm): số khách nằm ở `adult`, các loại khác luôn 0. */
export const paxTotal = (pax: Partial<Record<PaxCode, number>>): number => PAX_ORDER.reduce((n, c) => n + (pax[c] ?? 0), 0);

/** Khách tính tiền: mọi loại trừ em bé. */
export const payingGuests = (pax: Partial<Record<PaxCode, number>>): number => (pax.adult ?? 0) + (pax.child ?? 0) + (pax.senior ?? 0);

export interface GeneratedLine {
  /** Mã dịch vụ nguồn — lưu vào order_item.catalog_code để truy vết. */
  catalogCode: string;
  /** Loại khách của dòng (dịch vụ tính theo nhóm: "adult" = số khách). */
  pax: PaxCode;
  description: string;
  detail: string;
  quantity: number;
  /** Đơn giá thực tế của dòng: giá do người dùng nhập (nếu có) hoặc giá danh mục. */
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc sinh dòng — để lệch giá còn truy được về sau. */
  catalogPrice: number;
}

export type LinesResult = { ok: true; lines: GeneratedLine[] } | { ok: false; message: string };

/** Độ lệch đơn giá so với giá danh mục lúc lập dòng (dương = cao hơn); null = khớp hoặc dòng nhập tay. Một nguồn cho trang đơn, form và nhật ký. */
export function priceDeviation(line: { unitPrice: number; catalogPrice: number | null }): number | null {
  return line.catalogPrice !== null && line.catalogPrice !== line.unitPrice ? line.unitPrice - line.catalogPrice : null;
}

/**
 * Sinh dòng tiền cho `counts` khách. `unitPrices` (tuỳ chọn) ghi đè đơn giá từng loại (thương lượng); vắng = giá danh mục.
 * Chỉ kiểm khách/đơn vị/giá danh mục; kiểm khoảng của `unitPrices` là việc của luật đơn hàng (orders/service-rules.ts).
 */
export function buildLines(item: CatalogService, counts: Partial<Record<PaxCode, number>>, unitPrices: Partial<Record<PaxCode, number>> = {}): LinesResult {
  const unit = parseUnit(item.unit);
  if (unit.kind === "unknown") return { ok: false, message: `Dịch vụ này dùng đơn vị "${unit.raw}" mà hệ thống chưa hỗ trợ — hãy nhập tay.` };
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (!Number.isInteger(n) || n < 0 || n > MAX_GUESTS_PER_SERVICE) return { ok: false, message: `Số lượng ${PAX_LABEL[c].toLowerCase()} không hợp lệ.` };
  }
  if (paxTotal(counts) > MAX_GUESTS_PER_SERVICE) return { ok: false, message: `Tối đa ${MAX_GUESTS_PER_SERVICE} khách mỗi dịch vụ.` };

  if (unit.kind === "group") {
    const guests = counts.adult ?? 0;
    if (guests <= 0) return { ok: false, message: "Nhập số khách." };
    if (item.prices.adult === null) return { ok: false, message: "Dịch vụ này chưa có giá." };
    return {
      ok: true,
      lines: [
        {
          catalogCode: item.code,
          pax: "adult",
          description: item.name,
          detail: `${guests} khách (giá mỗi nhóm tối đa ${unit.size} khách)`,
          quantity: Math.ceil(guests / unit.size),
          unitPrice: unitPrices.adult ?? item.prices.adult,
          catalogPrice: item.prices.adult,
        },
      ],
    };
  }

  const lines: GeneratedLine[] = [];
  for (const c of PAX_ORDER) {
    const n = counts[c] ?? 0;
    if (n <= 0) continue;
    const price = item.prices[c];
    if (price === null) return { ok: false, message: `Dịch vụ này không có giá cho ${PAX_LABEL[c].toLowerCase()}.` };
    lines.push({
      catalogCode: item.code,
      pax: c,
      description: `${item.name} — ${PAX_LABEL[c]}`,
      detail: c === "adult" ? "" : (item.notes[c] ?? ""),
      quantity: n,
      unitPrice: unitPrices[c] ?? price,
      catalogPrice: price,
    });
  }
  return lines.length ? { ok: true, lines } : { ok: false, message: "Nhập số khách ít nhất một loại." };
}
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
npm test && npx tsc --noEmit && npx tsc --noEmit -p web
```

Expected: `# tests 53`, `# pass 53`; cả hai `tsc` không lỗi (web vẫn dùng `buildLines(c, counts())` hai đối số).

- [ ] **Bước 5: Commit**

```bash
git add src/shared/order-lines.ts src/shared/order-lines.test.ts
git commit -m "order-lines: trần 50 khách mỗi dịch vụ, đơn giá thực tế, catalogPrice và priceDeviation" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 3: Migration `0008_order_service.sql` + test SQL

**Files:**
- Create: `migrations/0008_order_service.sql`
- Test: `src/modules/orders/migration.test.ts`

**Interfaces:**
- Consumes: không có.
- Produces (SQL mà các task sau dựa vào):
  - Bảng `order_service` (cột như file bên dưới) — `pax_adult` cũng là "số khách" của dịch vụ chỉ một loại giá.
  - Cột mới của `order_item`: `service_id` (FK), `catalog_price`, `pax_code` (`CHECK` bốn mã loại khách).
  - Trigger: `order_item_service_scope_insert/update` (dòng tiền cùng đơn với dịch vụ), `order_service_frozen_insert/delete/update` (đơn không còn nháp: không thêm/xoá dịch vụ, không đổi thành phần; **trường vận hành vẫn sửa được**), `order_service_confirmed_keeps_date`, `orders_confirm_requires_trip` (chỉ lúc CHUYỂN sang xác nhận).
  - Backfill: mỗi `order_item` cũ → một `order_service` `unit='manual'`, dùng lại id dòng tiền; **trigger tạo SAU backfill**.

Thông báo lỗi trigger bắt đầu bằng mã (`order_frozen`, `incomplete_trip`, `service_scope`) để e2e và log đối chiếu bằng regex.

- [ ] **Bước 1: Viết test (ĐỎ)** — tạo `src/modules/orders/migration.test.ts`

Test dùng `node:sqlite` (SQLite thật, bật khoá ngoại như D1), áp lần lượt các file `migrations/*.sql`.

```ts
// Kiểm migration 0008 (order_service) trên SQLite thật (node:sqlite) — chạy nhanh, không cần wrangler.
// D1 là SQLite và bật khoá ngoại mặc định, nên đây là lưới đầu tiên cho CHECK/TRIGGER/backfill; e2e xác nhận lại trên D1 local.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../../../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const upTo = (last: string) => files.filter((f) => f <= last);

function open(list: string[]): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(sqlOf(f));
  return db;
}

const NOW = "2026-09-19T00:00:00.000Z";
function seedStaff(db: DatabaseSync) {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
}
function seedOrder(db: DatabaseSync, id: string, status = "draft") {
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}', 'TD-${id}', 's1', '${status}', 'K', '0900000009', '${NOW}', '${NOW}')`);
}
function seedService(db: DatabaseSync, id: string, orderId: string, extra = "") {
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, pax_adult ${extra ? ", " + extra.split("=")[0] : ""}) VALUES ('${id}', '${orderId}', 'Tour', 'perPax', 2 ${extra ? ", " + extra.split("=")[1] : ""})`);
}
const fails = (db: DatabaseSync, sql: string, re: RegExp) => assert.throws(() => db.exec(sql), re, sql);

test("backfill: mỗi dòng tiền cũ thành một dịch vụ nhập tay, dùng lại id của dòng", () => {
  const db = open(upTo("0007_audit_open_actions_catalog_code_money_guards.sql"));
  seedStaff(db);
  seedOrder(db, "o1", "confirmed");
  seedOrder(db, "o2", "draft");
  db.exec(`INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total, sort_order) VALUES
    ('i1', 'o1', 'Tour A', 2, 100, 200, 0), ('i2', 'o1', 'Áo phao', 1, 50, 50, 1), ('i3', 'o2', 'Tour B', 1, 10, 10, 0)`);
  db.exec(sqlOf("0008_order_service.sql"));
  const services = db.prepare("SELECT id, order_id, name, unit, catalog_code, pax_adult, depart_date FROM order_service ORDER BY id").all();
  assert.deepEqual(
    services.map((s) => ({ ...s })),
    [
      { id: "i1", order_id: "o1", name: "Tour A", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
      { id: "i2", order_id: "o1", name: "Áo phao", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
      { id: "i3", order_id: "o2", name: "Tour B", unit: "manual", catalog_code: null, pax_adult: 0, depart_date: null },
    ],
  );
  assert.deepEqual(db.prepare("SELECT id, service_id FROM order_item ORDER BY id").all().map((r) => ({ ...r })), [
    { id: "i1", service_id: "i1" }, { id: "i2", service_id: "i2" }, { id: "i3", service_id: "i3" },
  ]);
});

test("CHECK: ngày/giờ đúng khuôn dạng, số khách không âm", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  const ins = (cols: string, vals: string) => `INSERT INTO order_service (id, order_id, name, unit, ${cols}) VALUES ('${Math.random()}', 'o1', 'T', 'perPax', ${vals})`;
  db.exec(ins("depart_date, depart_time, pickup_time, checkin_date, checkin_time", "'2026-09-20', '07:30', '06:45', '2026-09-20', '23:59'"));
  db.exec(ins("depart_date", "NULL"));
  for (const bad of ["'2026-02-30'", "'2026-9-2'", "'20/09/2026'", "''"]) fails(db, ins("depart_date", bad), /CHECK constraint failed/);
  for (const bad of ["'24:00'", "'7:30'", "'07:60'", "'0730'"]) fails(db, ins("depart_time", bad), /CHECK constraint failed/);
  fails(db, ins("pickup_time", "'25:00'"), /CHECK constraint failed/);
  fails(db, ins("checkin_date", "'2026-13-01'"), /CHECK constraint failed/);
  fails(db, ins("pax_child", "-1"), /CHECK constraint failed/);
  fails(db, `INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total, pax_code) VALUES ('x', 'o1', 'd', 1, 1, 1, 'giant')`, /CHECK constraint failed/);
});

test("order_item.service_id phải thuộc cùng đơn", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedOrder(db, "o2");
  seedService(db, "sv1", "o1");
  db.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'd', 1, 5, 5)`);
  fails(db, `INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i2', 'o2', 'sv1', 'd', 1, 5, 5)`, /service_scope/);
  fails(db, `UPDATE order_item SET order_id = 'o2' WHERE id = 'i1'`, /service_scope/);
});

test("khoá ngoại: xoá dịch vụ khi còn dòng tiền trỏ vào bị chặn (thứ tự sửa nháp: xoá dòng tiền trước, dịch vụ sau)", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedService(db, "sv1", "o1");
  db.exec(`INSERT INTO order_item (id, order_id, service_id, description, quantity, unit_price, line_total) VALUES ('i1', 'o1', 'sv1', 'd', 1, 5, 5)`);
  fails(db, `DELETE FROM order_service WHERE id = 'sv1'`, /FOREIGN KEY constraint failed/);
  db.exec(`DELETE FROM order_item WHERE order_id = 'o1'`);
  db.exec(`DELETE FROM order_service WHERE order_id = 'o1'`); // đúng thứ tự → qua
});

test("đơn không còn nháp: không thêm/xoá dịch vụ, không đổi thành phần; trường vận hành vẫn sửa được", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "o1");
  seedService(db, "sv1", "o1", "depart_date='2026-09-20'");
  db.exec(`UPDATE orders SET status = 'confirmed' WHERE id = 'o1'`);
  fails(db, `INSERT INTO order_service (id, order_id, name, unit) VALUES ('sv2', 'o1', 'T', 'perPax')`, /order_frozen/);
  fails(db, `DELETE FROM order_service WHERE id = 'sv1'`, /order_frozen/);
  for (const col of ["pax_adult = 3", "pax_child = 1", "name = 'X'", "unit = 'per5Pax'", "catalog_code = 'TD1'", "sort_order = 5"]) {
    fails(db, `UPDATE order_service SET ${col} WHERE id = 'sv1'`, /order_frozen/);
  }
  db.exec(`UPDATE order_service SET depart_date = '2026-09-25', depart_time = '08:00', pickup_place = 'KS A', note = 'ăn chay' WHERE id = 'sv1'`);
  fails(db, `UPDATE order_service SET depart_date = NULL WHERE id = 'sv1'`, /incomplete_trip/);
  db.exec(`UPDATE order_service SET pickup_place = NULL, checkin_place = 'Cảng' WHERE id = 'sv1'`);
});

test("chỉ khi CHUYỂN sang xác nhận mới đòi đủ ngày + khách + có dịch vụ", () => {
  const db = open(files);
  seedStaff(db);
  seedOrder(db, "none");
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'none'`, /incomplete_trip/); // không có dịch vụ
  seedOrder(db, "nodate");
  seedService(db, "a", "nodate");
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'nodate'`, /incomplete_trip/);
  seedOrder(db, "noguest");
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, depart_date) VALUES ('b', 'noguest', 'T', 'perPax', '2026-09-20')`);
  fails(db, `UPDATE orders SET status = 'confirmed' WHERE id = 'noguest'`, /incomplete_trip/);
  seedOrder(db, "ok");
  seedService(db, "c", "ok", "depart_date='2026-09-20'");
  db.exec(`INSERT INTO order_service (id, order_id, name, unit, depart_date, pax_child) VALUES ('d', 'ok', 'T2', 'manual', '2026-09-21', 1)`);
  db.exec(`UPDATE orders SET status = 'confirmed' WHERE id = 'ok'`);
  db.exec(`UPDATE orders SET updated_at = '2026-09-20T00:00:00.000Z' WHERE id = 'ok'`); // cập nhật sau xác nhận không bị chặn lại
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'ok'`);
});

test("đơn cũ đã xác nhận trước migration (không có ngày/khách) vẫn cập nhật/huỷ được", () => {
  const db = open(upTo("0007_audit_open_actions_catalog_code_money_guards.sql"));
  seedStaff(db);
  seedOrder(db, "old", "confirmed");
  db.exec(`INSERT INTO order_item (id, order_id, description, quantity, unit_price, line_total) VALUES ('i1', 'old', 'Tour', 1, 10, 10)`);
  db.exec(sqlOf("0008_order_service.sql"));
  db.exec(`UPDATE orders SET updated_at = '2026-09-20T00:00:00.000Z' WHERE id = 'old'`);
  db.exec(`UPDATE orders SET status = 'cancelled' WHERE id = 'old'`);
});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/modules/orders/migration.test.ts
```

Expected: FAIL 7/7 — test đầu báo `ENOENT: no such file or directory, open '…/migrations/0008_order_service.sql'`, các test còn lại báo thiếu bảng `order_service`. (In thêm cảnh báo `ExperimentalWarning: SQLite is an experimental feature` là bình thường.)

- [ ] **Bước 3: Cài đặt** — tạo `migrations/0008_order_service.sql`

```sql
-- Thông tin chuyến đi theo từng dịch vụ trong đơn (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md §3).
-- Cửa MỘT CHIỀU (schema order). Chỉ thêm bảng/cột/trigger; không sửa bảng đã có dữ liệu.

-- 1) Một dịch vụ trong đơn: số khách theo loại + thông tin chuyến. Tiền vẫn ở order_item.
--    CHECK chỉ cho bất biến không đổi (khuôn dạng ngày/giờ, số khách >= 0); trần 50 khách nằm ở code (MAX_GUESTS_PER_SERVICE).
CREATE TABLE order_service (
  id            TEXT PRIMARY KEY,
  order_id      TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  catalog_code  TEXT,                 -- NULL = nhập tay; không FK (như order_item.catalog_code)
  name          TEXT NOT NULL,        -- chụp lúc lập đơn
  unit          TEXT NOT NULL,        -- chuỗi đơn vị của Sheet lúc lập đơn ('perPax', 'per5Pax'…); 'manual' = nhập tay
  pax_adult     INTEGER NOT NULL DEFAULT 0 CHECK (pax_adult  >= 0),  -- dịch vụ tính "số khách": lưu ở đây
  pax_child     INTEGER NOT NULL DEFAULT 0 CHECK (pax_child  >= 0),
  pax_senior    INTEGER NOT NULL DEFAULT 0 CHECK (pax_senior >= 0),
  pax_infant    INTEGER NOT NULL DEFAULT 0 CHECK (pax_infant >= 0),
  depart_date   TEXT CHECK (date(depart_date) IS depart_date),       -- YYYY-MM-DD, giờ Việt Nam
  depart_time   TEXT CHECK (depart_time  IS NULL OR depart_time  GLOB '[01][0-9]:[0-5][0-9]' OR depart_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_time   TEXT CHECK (pickup_time  IS NULL OR pickup_time  GLOB '[01][0-9]:[0-5][0-9]' OR pickup_time  GLOB '2[0-3]:[0-5][0-9]'),
  pickup_place  TEXT,
  checkin_date  TEXT CHECK (date(checkin_date) IS checkin_date),     -- NULL = cùng ngày khởi hành (không lưu trùng)
  checkin_time  TEXT CHECK (checkin_time IS NULL OR checkin_time GLOB '[01][0-9]:[0-5][0-9]' OR checkin_time GLOB '2[0-3]:[0-5][0-9]'),
  checkin_place TEXT,
  note          TEXT
);
CREATE INDEX idx_order_service_order  ON order_service(order_id);
CREATE INDEX idx_order_service_depart ON order_service(depart_date);

-- 2) Dòng tiền trỏ về dịch vụ của nó. `catalog_price` = giá danh mục hiệu lực lúc lập dòng (NULL = nhập tay) để lệch giá
--    còn truy được về sau; `pax_code` = loại khách của dòng (NULL = nhập tay). Cột thêm sau, mặc định NULL nên SQLite cho phép REFERENCES.
ALTER TABLE order_item ADD COLUMN service_id TEXT REFERENCES order_service(id);
ALTER TABLE order_item ADD COLUMN catalog_price INTEGER;
ALTER TABLE order_item ADD COLUMN pax_code TEXT CHECK (pax_code IN ('adult', 'child', 'senior', 'infant'));
CREATE INDEX idx_order_item_service ON order_item(service_id);

-- 3) Đơn cũ: mỗi dòng tiền cũ thành một dịch vụ nhập tay (khách = 0, chưa có thông tin chuyến), dùng lại id của dòng làm id dịch vụ.
--    PHẢI chạy trước các trigger bên dưới (đơn đã xác nhận/huỷ sẽ bị trigger chặn chèn dịch vụ).
INSERT INTO order_service (id, order_id, sort_order, catalog_code, name, unit)
  SELECT id, order_id, sort_order, NULL, description, 'manual' FROM order_item WHERE service_id IS NULL;
UPDATE order_item SET service_id = id WHERE service_id IS NULL;

-- 4) Lưới SQL thứ hai (mẫu 0007): luật chính ở orders/rules.ts + câu UPDATE có điều kiện; đây là chốt cuối nếu một đường code quên.
CREATE TRIGGER order_item_service_scope_insert BEFORE INSERT ON order_item
WHEN NEW.service_id IS NOT NULL AND (SELECT order_id FROM order_service WHERE id = NEW.service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'service_scope: service_id thuộc đơn khác'); END;

CREATE TRIGGER order_item_service_scope_update BEFORE UPDATE ON order_item
WHEN NEW.service_id IS NOT NULL AND (SELECT order_id FROM order_service WHERE id = NEW.service_id) IS NOT NEW.order_id
BEGIN SELECT RAISE(ABORT, 'service_scope: service_id thuộc đơn khác'); END;

-- Đơn không còn nháp: không thêm/xoá dịch vụ, không đổi thành phần (dịch vụ, số khách). Trường vận hành (ngày giờ, đón, check-in, ghi chú) vẫn sửa được (Q9).
CREATE TRIGGER order_service_frozen_insert BEFORE INSERT ON order_service
WHEN (SELECT status FROM orders WHERE id = NEW.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_frozen_delete BEFORE DELETE ON order_service
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_frozen_update BEFORE UPDATE ON order_service
WHEN (SELECT status FROM orders WHERE id = OLD.order_id) <> 'draft'
  AND (NEW.order_id IS NOT OLD.order_id OR NEW.sort_order IS NOT OLD.sort_order
    OR NEW.catalog_code IS NOT OLD.catalog_code OR NEW.name IS NOT OLD.name OR NEW.unit IS NOT OLD.unit
    OR NEW.pax_adult IS NOT OLD.pax_adult OR NEW.pax_child IS NOT OLD.pax_child
    OR NEW.pax_senior IS NOT OLD.pax_senior OR NEW.pax_infant IS NOT OLD.pax_infant)
BEGIN SELECT RAISE(ABORT, 'order_frozen: đơn không còn ở trạng thái nháp'); END;

CREATE TRIGGER order_service_confirmed_keeps_date BEFORE UPDATE ON order_service
WHEN NEW.depart_date IS NULL AND (SELECT status FROM orders WHERE id = OLD.order_id) = 'confirmed'
BEGIN SELECT RAISE(ABORT, 'incomplete_trip: đơn đã xác nhận phải có ngày khởi hành'); END;

-- Chỉ LÚC chuyển sang xác nhận (không chặn các cập nhật sau đó, kể cả đơn cũ đã xác nhận từ trước migration này):
-- có ít nhất một dịch vụ, mọi dịch vụ có ngày khởi hành và >= 1 khách. Khoảng ngày (không quá khứ, <= 365 ngày) là luật đổi được → nằm ở code.
CREATE TRIGGER orders_confirm_requires_trip BEFORE UPDATE ON orders
WHEN NEW.status = 'confirmed' AND OLD.status <> 'confirmed'
  AND (NOT EXISTS (SELECT 1 FROM order_service WHERE order_id = NEW.id)
    OR EXISTS (SELECT 1 FROM order_service WHERE order_id = NEW.id
               AND (depart_date IS NULL OR pax_adult + pax_child + pax_senior + pax_infant < 1)))
BEGIN SELECT RAISE(ABORT, 'incomplete_trip: đơn thiếu ngày khởi hành hoặc số khách'); END;
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
node --test src/modules/orders/migration.test.ts && npm test
```

Expected: 7/7 xanh; `npm test` tổng `# tests 60`, `# pass 60`.

- [ ] **Bước 5 (khuyến nghị, không commit): kiểm test có bắt lỗi thật** — lần lượt xoá một trigger hoặc một `CHECK` trong `0008_order_service.sql` (vd bỏ `orders_confirm_requires_trip`, đổi `GLOB '2[0-3]…'` thành `'2[0-9]…'`, đặt một trigger TRƯỚC khối backfill) rồi chạy lại Bước 4: mỗi lần phải có ít nhất 1 test đỏ. Khôi phục file sau khi thử (`git checkout migrations/0008_order_service.sql` nếu đã add; nếu chưa, sửa lại tay). Phiên soạn kế hoạch đã làm đủ 8 đột biến và tất cả đều bị bắt.

- [ ] **Bước 6: Commit**

```bash
git add migrations/0008_order_service.sql src/modules/orders/migration.test.ts
git commit -m "Migration 0008: order_service (khách + chuyến theo dịch vụ), cột dòng tiền, trigger, backfill" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 4: Catalog xuất "giá hiệu lực + đang hiện" (`toEffective`, `getEffectiveServices`)

**Files:**
- Modify: `src/modules/catalog/rules.ts`, `src/modules/catalog/index.ts`
- Test: `src/modules/catalog/rules.test.ts`

**Interfaces:**
- Consumes: `EffectiveService` (Task 2, `src/shared/order-lines.ts`).
- Produces:
  - `toEffective(s: CatalogRecord & { override: Override | null }): EffectiveService` trong `catalog/rules.ts` — `visible = còn trong Sheet && không bị Admin ẩn`.
  - `getEffectiveServices(db: D1Database, codes?: readonly string[]): Promise<Map<string, EffectiveService>>` xuất từ `catalog/index.ts` — module `orders` **chỉ** dùng hàm này để biết giá hiệu lực; `GET /api/catalog` dùng chính `toEffective` để lọc "đang hiện" (một nguồn, P6).

- [ ] **Bước 1: Viết test (ĐỎ)** — sửa `src/modules/catalog/rules.test.ts`

```diff
--- a/src/modules/catalog/rules.test.ts
+++ b/src/modules/catalog/rules.test.ts
@@ -1,6 +1,6 @@
 import { test } from "node:test";
 import assert from "node:assert/strict";
-import { acknowledge, applyOverride, patchOverride, planSync, summarizePlan, syncGuard, type CatalogRecord } from "./rules.ts";
+import { acknowledge, applyOverride, patchOverride, planSync, summarizePlan, syncGuard, toEffective, type CatalogRecord } from "./rules.ts";
 import type { CatalogInput } from "./sheet.ts";
 
 const P = (adult: number, child: number | null = null) => ({ adult, child, senior: null, infant: null });
@@ -85,3 +85,17 @@
   assert.equal(ov, null);
   assert.equal(applyOverride(P(1), null).hidden, false);
 });
+
+test("toEffective: giá hiệu lực (đã ghi đè) + visible = còn trong Sheet và không bị ẩn", () => {
+  const base = { ...rec("A", 850000), prices: P(850000, 595000), override: null };
+  assert.deepEqual(toEffective(base), { code: "A", name: "Tour A", unit: "perPax", prices: P(850000, 595000), notes: N, visible: true });
+  // ghi đè giá: giá hiệu lực đổi, vẫn hiện
+  const priced = toEffective({ ...base, override: patchOverride(base.prices, null, { prices: { adult: 800000 } }) });
+  assert.deepEqual([priced.prices.adult, priced.prices.child, priced.visible], [800000, 595000, true]);
+  // Admin ẩn → không hiện, nhưng vẫn có mặt (để đơn nháp cũ nhận ra "dịch vụ đã ẩn")
+  assert.equal(toEffective({ ...base, override: patchOverride(base.prices, null, { hidden: true }) }).visible, false);
+  // biến mất khỏi Sheet → không hiện
+  assert.equal(toEffective({ ...base, inSheet: false }).visible, false);
+  // vừa bị ẩn vừa rời Sheet
+  assert.equal(toEffective({ ...base, inSheet: false, override: patchOverride(base.prices, null, { hidden: true }) }).visible, false);
+});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/modules/catalog/rules.test.ts
```

Expected: FAIL — `SyntaxError: The requested module './rules.ts' does not provide an export named 'toEffective'`.

- [ ] **Bước 3: Cài đặt** — sửa `src/modules/catalog/rules.ts` và `src/modules/catalog/index.ts`

```diff
--- a/src/modules/catalog/rules.ts
+++ b/src/modules/catalog/rules.ts
@@ -1,5 +1,5 @@
 // Luật thuần của danh mục: kế hoạch đồng bộ, ghi đè có chủ đích, chốt chặn Sheet hỏng. Không I/O.
-import { PAX_LABEL, PAX_ORDER, type PaxCode, type Prices } from "../../shared/order-lines.ts";
+import { PAX_LABEL, PAX_ORDER, type EffectiveService, type PaxCode, type Prices } from "../../shared/order-lines.ts";
 import type { CatalogInput } from "./sheet.ts";
 
 /** Bản ghi đang lưu trong D1 (phần lấy từ Sheet). */
@@ -125,3 +125,12 @@
   for (const c of Object.keys(ov.prices) as PaxCode[]) base[c] = sheet[c];
   return { ...ov, base };
 }
+
+/**
+ * Dịch vụ như bên bán hàng dùng: giá hiệu lực (đã áp ghi đè của Admin) + `visible` = còn trong Sheet và không bị Admin ẩn.
+ * MỘT nguồn cho "đang hiện / giá hiệu lực": danh mục công khai (`GET /api/catalog`) và luật đơn hàng cùng gọi hàm này.
+ */
+export function toEffective(s: CatalogRecord & { override: Override | null }): EffectiveService {
+  const eff = applyOverride(s.prices, s.override);
+  return { code: s.code, name: s.name, unit: s.unit, prices: eff.prices, notes: s.notes, visible: s.inSheet && !eff.hidden };
+}
```
```diff
--- a/src/modules/catalog/index.ts
+++ b/src/modules/catalog/index.ts
@@ -4,15 +4,26 @@
 import { error, json, readJson } from "../../shared/http";
 import { route, type AppModule } from "../../shared/router";
 import type { CatalogAdminItemDto, CatalogAdminResponse, CatalogItemResponse, CatalogPublicResponse, CatalogServiceDto, CatalogSyncResponse } from "../../shared/contracts";
-import { CATALOG_CODE_RE as CODE_RE, MAX_AMOUNT_VND as MAX_PRICE, PAX_LABEL, PAX_ORDER, parseUnit, type PaxCode } from "../../shared/order-lines";
+import { CATALOG_CODE_RE as CODE_RE, MAX_AMOUNT_VND as MAX_PRICE, PAX_LABEL, PAX_ORDER, parseUnit, type EffectiveService, type PaxCode } from "../../shared/order-lines";
 import { getSyncState, loadAll, loadOne, saveOverride, type StoredItem } from "./repository";
-import { acknowledge, applyOverride, money, patchOverride, type OverridePatch } from "./rules";
+import { acknowledge, applyOverride, money, patchOverride, toEffective, type OverridePatch } from "./rules";
 import { bootstrapIfNeverSynced, syncCatalog } from "./service";
 
+export type { EffectiveService };
 
+/**
+ * API công khai của module (module khác CHỈ import từ file này): dịch vụ theo mã (bỏ `codes` = tất cả), giá đã áp ghi đè,
+ * kèm cờ `visible`. Đơn hàng dùng để biết giá hiệu lực và dịch vụ nào đang bán được — không tự tính lại.
+ */
+export async function getEffectiveServices(db: D1Database, codes?: readonly string[]): Promise<Map<string, EffectiveService>> {
+  const want = codes ? new Set(codes) : null;
+  const all = await loadAll(db);
+  return new Map(all.filter((s) => !want || want.has(s.code)).map((s) => [s.code, toEffective(s)]));
+}
+
 /** Dịch vụ như nhân viên bán hàng thấy: giá hiệu lực (đã áp ghi đè), không lộ thông tin ghi đè hay Sheet. */
-function publicItem(s: StoredItem): CatalogServiceDto {
-  return { code: s.code, name: s.name, unit: s.unit, prices: applyOverride(s.prices, s.override).prices, notes: s.notes, supported: parseUnit(s.unit).kind !== "unknown" };
+function publicItem(e: EffectiveService): CatalogServiceDto {
+  return { code: e.code, name: e.name, unit: e.unit, prices: e.prices, notes: e.notes, supported: parseUnit(e.unit).kind !== "unknown" };
 }
 
 function adminItem(s: StoredItem): CatalogAdminItemDto {
@@ -70,7 +81,7 @@
         /* Sheet lỗi ở lần đầu: vẫn trả danh mục rỗng + cảnh báo bên dưới, cho phép nhập tay */
       }
       const [items, state] = await Promise.all([loadAll(env.DB), getSyncState(env.DB)]);
-      const visible = items.filter((s) => s.inSheet && !applyOverride(s.prices, s.override).hidden).map(publicItem);
+      const visible = items.map(toEffective).filter((e) => e.visible).map(publicItem);
       return json({ items: visible, sync: { lastSuccessAt: state.lastSuccessAt, error: state.lastError } } satisfies CatalogPublicResponse);
     }),
 
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
npm test && npx tsc --noEmit && npx tsc --noEmit -p web
```

Expected: `# tests 61`, `# pass 61`; hai `tsc` không lỗi. (Hành vi `GET /api/catalog` không đổi; `catalog.mjs` trong Task 8/9 xác nhận lại với Google Sheet thật.)

- [ ] **Bước 5: Commit**

```bash
git add src/modules/catalog/rules.ts src/modules/catalog/rules.test.ts src/modules/catalog/index.ts
git commit -m "catalog: toEffective + getEffectiveServices — một nguồn cho giá hiệu lực và dịch vụ đang hiện" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 5: Luật thuần cho MỘT dịch vụ (`fields.ts`, `service-rules.ts`) + hợp đồng (thêm kiểu) + hành động nhật ký

**Files:**
- Create: `src/modules/orders/fields.ts`, `src/modules/orders/service-rules.ts`
- Modify: `src/shared/contracts.ts` (**chỉ thêm** kiểu mới, chưa đổi kiểu cũ), `src/shared/audit-actions.ts`
- Test: `src/modules/orders/service-rules.test.ts`

**Interfaces:**
- Consumes: Task 1 (`isISODate`, `isHHMM`, `addDays`), Task 2 (`buildLines`, `paxTotal`, `payingGuests`, `priceDeviation`, `EffectiveService`, `PaxCounts`, `MAX_*`).
- Produces trong `fields.ts`: `text`, `int`, `cleanText(v, label, max, multiline)`, `dateField`, `timeField`.
- Produces trong `service-rules.ts`:
  - hằng: `MAX_SERVICES = 20`, `MAX_LINES_PER_ORDER = 50`, `MAX_DAYS_AHEAD = 365`.
  - kiểu: `ValidTrip` (= `TripInfoDto`), `ValidItem` (có `paxCode`, `catalogPrice`), `ValidService` (`id | null`, `kind`, `catalogCode`, `name`, `unit`, `pax`, `trip`, `items`), `StoredService`, `ServiceContext { catalog: ReadonlyMap<string, EffectiveService>; stored: readonly StoredService[] }`, `ServiceFailure` (`code?: "catalog_changed" | "catalog_unavailable"`, `details?`).
  - `validateService(raw, index, ctx): ServiceResult`, `validateTrip(s, at)`, `snapshotService(stored)`.
  - `confirmWindow(today) → { from, to }`, `confirmGaps(services, today): TripGapDto[]`, `catalogStatusOf(svc, eff): CatalogStatus | null`.
  - `validateTripUpdate(input, stored, status, today): TripUpdateResult`.
  - `summarizeDeviations(items)`, `describeTripChange(...)`, `describeTripUpdates(...)` — chuỗi cho nhật ký, **không chứa giá trị chuỗi tự do**.
- Produces trong `contracts.ts`: `CatalogStatus`, `MissingReason`, `TripGapDto`, `CatalogChangeDto`, `TripInfoDto`, `OrderServiceDto`, `TripInput`, `ServiceInput`, `TripUpdateInput`, `IncompleteTripBody`, `CatalogChangedBody`; re-export `PaxCounts`.
- Produces trong `audit-actions.ts`: hành động `trip_updated` (nhóm `order`).

Quy tắc chính được cài ở đây (khớp spec §4.2, Q7–Q12): dịch vụ danh mục — dòng tiền do máy chủ sinh; cùng `id` + mã + số khách với dịch vụ đã lưu thì **giữ bản chụp** (Q11), ngược lại phải còn trong danh mục và `catalogPriceSeen` phải khớp giá hiện tại (không thì `catalog_changed`); cần ≥ 1 khách không phải em bé; dịch vụ nhập tay — số khách chỉ là thông tin vận hành, tiền nhập tự do.

- [ ] **Bước 1: Viết test (ĐỎ)** — tạo `src/modules/orders/service-rules.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { EffectiveService } from "../../shared/order-lines.ts";
import {
  catalogStatusOf, confirmGaps, confirmWindow, describeTripChange, describeTripUpdates, snapshotService, summarizeDeviations, validateService, validateTrip, validateTripUpdate,
  type ServiceContext, type StoredService,
} from "./service-rules.ts";

const NOTES = { child: "Trẻ em cao từ 1 m đến 1,4 mét", senior: "Người cao tuổi >= 60 tuổi", infant: "Luôn miễn phí" };
const tour: EffectiveService = { code: "TD101", name: "Tour 3 đảo", unit: "perPax", prices: { adult: 850000, child: 595000, senior: 850000, infant: 0 }, notes: NOTES, visible: true };
const banana: EffectiveService = { code: "TTB03", name: "Phao chuối", unit: "per5Pax", prices: { adult: 1000000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null }, visible: true };
const jetski: EffectiveService = { code: "TTB06", name: "Motor nước", unit: "perPax", prices: { adult: 800000, child: null, senior: null, infant: null }, notes: { child: null, senior: null, infant: null }, visible: true };
const catalog = (...s: EffectiveService[]) => new Map(s.map((x) => [x.code, x]));
const ctx = (stored: StoredService[] = [], ...s: EffectiveService[]): ServiceContext => ({ catalog: catalog(...(s.length ? s : [tour, banana, jetski])), stored });

const P = (adult = 0, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const catalogInput = (extra: Record<string, unknown> = {}) => ({
  kind: "catalog", catalogCode: "TD101", pax: P(2, 1), catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: "2026-09-25", ...extra,
});
function ok(raw: unknown, c: ServiceContext = ctx()) {
  const r = validateService(raw, 0, c);
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
}
function bad(raw: unknown, c: ServiceContext = ctx()) {
  const r = validateService(raw, 0, c);
  assert.ok(!r.ok);
  return r;
}

// ---- dịch vụ danh mục: dòng tiền do máy chủ sinh ----
test("danh mục: máy chủ sinh dòng tiền theo số khách, mang catalogPrice + loại khách, không nhận số lượng từ client", () => {
  const v = ok({ ...catalogInput(), items: [{ description: "hack", quantity: 99, unitPrice: 1 }] });
  assert.deepEqual(v.items.map((i) => [i.paxCode, i.quantity, i.unitPrice, i.catalogPrice, i.lineTotal, i.catalogCode]), [
    ["adult", 2, 850000, 850000, 1700000, "TD101"],
    ["child", 1, 595000, 595000, 595000, "TD101"],
  ]);
  assert.equal(v.items[1]!.detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(v.items[0]!.detail, null);
  assert.deepEqual([v.kind, v.name, v.unit, v.id], ["catalog", "Tour 3 đảo", "perPax", null]);
});

test("danh mục: đơn giá thương lượng lưu unitPrice khác catalogPrice (Q7: chỉ ghi nhận, không chặn)", () => {
  const v = ok(catalogInput({ unitPrices: { adult: 800000 } }));
  assert.deepEqual(v.items.map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
  assert.equal(ok(catalogInput({ unitPrices: { adult: 0 } })).items[0]!.unitPrice, 0);
});

test("danh mục: dịch vụ nhóm — số khách ở adult, số lượng = ceil(khách / cỡ nhóm)", () => {
  const v = ok({ kind: "catalog", catalogCode: "TTB03", pax: P(7), catalogPriceSeen: { adult: 1000000 } });
  assert.deepEqual(v.items.map((i) => [i.quantity, i.unitPrice, i.lineTotal, i.paxCode]), [[2, 1000000, 2000000, "adult"]]);
});

test("danh mục: loại khách không có giá → lỗi; đơn giá cho loại không có khách → lỗi", () => {
  assert.match(bad({ kind: "catalog", catalogCode: "TTB06", pax: P(1, 1), catalogPriceSeen: { adult: 800000 } }).message, /không có giá cho trẻ em/);
  assert.match(bad(catalogInput({ pax: P(2), unitPrices: { child: 1 } })).message, /không có khách loại này/);
  assert.match(bad(catalogInput({ unitPrices: { hack: 1 } })).message, /loại khách "hack"/);
  assert.match(bad(catalogInput({ unitPrices: { adult: 1.5 } })).message, /số nguyên/);
  assert.match(bad(catalogInput({ unitPrices: { adult: -1 } })).message, /đơn giá/);
});

test("danh mục: cần ≥ 1 khách không phải em bé; trần 50 khách; số khách phải là số nguyên", () => {
  assert.match(bad(catalogInput({ pax: P(0, 0, 0, 2), catalogPriceSeen: { infant: 0 } })).message, /không phải em bé/);
  assert.match(bad(catalogInput({ pax: P(0) })).message, /không phải em bé/);
  assert.match(bad(catalogInput({ pax: P(30, 21) })).message, /tối đa 50 khách/);
  assert.match(bad(catalogInput({ pax: P(51) })).message, /số khách người lớn/);
  assert.match(bad(catalogInput({ pax: { adult: 1.5 } })).message, /số nguyên/);
  assert.match(bad(catalogInput({ pax: undefined })).message, /thiếu số khách/);
  ok(catalogInput({ pax: P(50), catalogPriceSeen: { adult: 850000 } }));
});

test("BK5: giá danh mục đã xem khác giá hiện tại → catalog_changed kèm chi tiết; thiếu giá đã xem → lỗi đầu vào", () => {
  const r = bad(catalogInput({ catalogPriceSeen: { adult: 900000, child: 595000 } }));
  assert.equal(r.code, "catalog_changed");
  assert.deepEqual(r.details, [{ serviceIndex: 0, catalogCode: "TD101", pax: "adult", seen: 900000, current: 850000 }]);
  const missing = bad(catalogInput({ catalogPriceSeen: { adult: 850000 } }));
  assert.equal(missing.code, undefined);
  assert.match(missing.message, /thiếu giá danh mục đã xem cho trẻ em/);
});

test("danh mục: mã sai dạng / không có / đang ẩn → lỗi; ẩn = catalog_unavailable", () => {
  assert.match(bad(catalogInput({ catalogCode: "có dấu" })).message, /mã dịch vụ/);
  assert.equal(bad(catalogInput({ catalogCode: "NOPE" })).code, "catalog_unavailable");
  assert.equal(bad(catalogInput(), ctx([], { ...tour, visible: false })).code, "catalog_unavailable");
  assert.equal(bad(catalogInput({ catalogCode: "TD101" }), ctx([], banana)).code, "catalog_unavailable");
});

test("danh mục: đơn vị chưa hỗ trợ → lỗi rõ", () => {
  assert.match(bad(catalogInput(), ctx([], { ...tour, unit: "perGroup" })).message, /chưa hỗ trợ/);
});

// ---- Q11: bản chụp cho nháp cũ ----
const stored: StoredService = {
  id: "sv1", catalogCode: "TD101", name: "Tour 3 đảo (cũ)", unit: "perPax", pax: P(2, 1),
  items: [
    { paxCode: "adult", detail: null, catalogPrice: 850000 },
    { paxCode: "child", detail: "Trẻ em cao từ 1 m đến 1,4 mét", catalogPrice: 595000 },
  ],
};

test("bản chụp: cùng id + mã + số khách → giữ tên/đơn vị/giá đã lưu dù danh mục đã ẩn hoặc đã đổi giá", () => {
  const hidden = ctx([stored], { ...tour, visible: false });
  const v = ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1) }, hidden);
  assert.deepEqual([v.id, v.name, v.unit], ["sv1", "Tour 3 đảo (cũ)", "perPax"]);
  assert.deepEqual(v.items.map((i) => [i.unitPrice, i.catalogPrice]), [[850000, 850000], [595000, 595000]]);
  assert.equal(v.items[1]!.detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  // Sheet đổi giá 850k → 700k: vẫn giữ 850k, không cần catalogPriceSeen
  const moved = ctx([stored], { ...tour, prices: { ...tour.prices, adult: 700000 } });
  assert.equal(ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1) }, moved).items[0]!.catalogPrice, 850000);
  // người dùng vẫn sửa được đơn giá thương lượng trên bản chụp
  assert.deepEqual(ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(2, 1), unitPrices: { adult: 800000 } }, moved).items.map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
});

test("bản chụp: đổi số khách hoặc đổi dịch vụ → phải tra danh mục còn hiện; id cũ vẫn giữ", () => {
  const hidden = ctx([stored], { ...tour, visible: false });
  assert.equal(bad({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(3, 1), catalogPriceSeen: { adult: 850000, child: 595000 } }, hidden).code, "catalog_unavailable");
  const live = ctx([stored]);
  const v = ok({ kind: "catalog", catalogCode: "TD101", id: "sv1", pax: P(3, 1), catalogPriceSeen: { adult: 850000, child: 595000 } }, live);
  assert.deepEqual([v.id, v.name], ["sv1", "Tour 3 đảo"]); // tên/giá lấy lại từ danh mục hiện tại
  // id lạ (không thuộc đơn này) không được hưởng bản chụp và không được mượn id
  const stranger = bad({ kind: "catalog", catalogCode: "TD101", id: "other", pax: P(2, 1) }, hidden);
  assert.equal(stranger.code, "catalog_unavailable");
});

test("snapshotService: dựng lại giá + ghi chú loại khách; thiếu dữ liệu → null", () => {
  const snap = snapshotService(stored)!;
  assert.deepEqual(snap.prices, { adult: 850000, child: 595000, senior: null, infant: null });
  assert.equal(snap.notes.child, "Trẻ em cao từ 1 m đến 1,4 mét");
  assert.equal(snapshotService({ ...stored, catalogCode: null }), null);
  assert.equal(snapshotService({ ...stored, items: [{ paxCode: null, detail: null, catalogPrice: null }] }), null);
  assert.equal(snapshotService({ ...stored, items: [] }), null);
});

// ---- dịch vụ nhập tay (Q10) ----
const manualInput = (extra: Record<string, unknown> = {}) => ({
  kind: "manual", name: " Thuê áo phao ", pax: P(3), items: [{ description: "Áo phao", quantity: 3, unitPrice: 50000, detail: "size L" }], ...extra,
});

test("nhập tay: tiền nhập tự do, số khách chỉ là thông tin vận hành (không khớp dòng tiền cũng được)", () => {
  const v = ok(manualInput({ pax: P(7) }));
  assert.deepEqual([v.kind, v.catalogCode, v.unit, v.name], ["manual", null, "manual", "Thuê áo phao"]);
  assert.deepEqual(v.items.map((i) => [i.description, i.quantity, i.unitPrice, i.lineTotal, i.paxCode, i.catalogPrice, i.catalogCode]), [["Áo phao", 3, 50000, 150000, null, null, null]]);
  assert.equal(ok(manualInput({ pax: P(0) })).pax.adult, 0); // 0 khách lưu nháp được; chỉ chặn lúc xác nhận
});

test("nhập tay: tên và dòng tiền bắt buộc, kiểm số nguyên/khoảng như dòng nhập tay cũ", () => {
  assert.match(bad(manualInput({ name: "  " })).message, /tên dịch vụ/);
  assert.match(bad(manualInput({ items: [] })).message, /ít nhất một dòng/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 1, unitPrice: "5" }] })).message, /đơn giá/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 0, unitPrice: 5 }] })).message, /số lượng/);
  assert.match(bad(manualInput({ items: [{ description: "", quantity: 1, unitPrice: 5 }] })).message, /mô tả/);
  assert.match(bad(manualInput({ items: [{ description: "x", quantity: 100000, unitPrice: 100000000000 }] })).message, /vượt giới hạn/);
  assert.match(bad({ kind: "khac" }).message, /loại dịch vụ/);
  assert.match(bad(null).message, /không hợp lệ/);
});

test("nhập tay: id trỏ tới dịch vụ đã lưu của đơn được giữ; id lạ bị bỏ", () => {
  assert.equal(ok(manualInput({ id: "sv1" }), ctx([{ ...stored, id: "sv1" }])).id, "sv1");
  assert.equal(ok(manualInput({ id: "zzz" }), ctx([stored])).id, null);
});

// ---- thông tin chuyến ----
test("chuyến: chuẩn hoá rỗng → null, bỏ ký tự điều khiển, ghi chú giữ xuống dòng", () => {
  const r = validateTrip({ departDate: "2026-09-25", departTime: " 07:30 ", pickupTime: "", pickupPlace: "KS A\n\t50 Trần Phú\u0007", checkinPlace: "  ", note: "ăn chay\r\nsay sóng\u0000ok" }, "Dịch vụ 1");
  assert.ok(r.ok);
  assert.deepEqual(r.value, {
    departDate: "2026-09-25", departTime: "07:30", pickupTime: null, pickupPlace: "KS A 50 Trần Phú", checkinDate: null, checkinTime: null, checkinPlace: null, note: "ăn chay\nsay sóng ok",
  });
});

test("chuyến: ngày phải đúng lịch, giờ HH:MM 00:00–23:59, độ dài giới hạn", () => {
  for (const [field, value, re] of [
    ["departDate", "2026-02-30", /ngày khởi hành/], ["departDate", "20/09/2026", /ngày khởi hành/], ["checkinDate", "2026-13-01", /ngày check-in/],
    ["departTime", "24:00", /giờ khởi hành/], ["pickupTime", "7:30", /giờ đón/], ["checkinTime", "07:60", /giờ check-in/], ["departDate", 20260925, /ngày khởi hành/],
    ["pickupPlace", "x".repeat(201), /tối đa 200/], ["checkinPlace", "x".repeat(201), /tối đa 200/], ["note", "x".repeat(1001), /tối đa 1000/],
  ] as const) {
    const r = validateTrip({ [field]: value }, "Dịch vụ 1");
    assert.ok(!r.ok, `${field}=${String(value)}`);
    assert.match(r.message, re);
  }
  assert.ok(validateTrip({ pickupPlace: "x".repeat(200), note: "x".repeat(1000) }, "D").ok);
});

// ---- điều kiện xác nhận (Q4 + Q12) ----
test("khoảng xác nhận: từ hôm nay đến +365 ngày", () => {
  assert.deepEqual(confirmWindow("2026-09-19"), { from: "2026-09-19", to: "2027-09-19" });
});

test("confirmGaps: thiếu ngày / quá khứ / quá xa / 0 khách — mỗi dịch vụ một danh sách lý do", () => {
  const today = "2026-09-19";
  const s = (id: string, departDate: string | null, guests = 1) => ({ id, name: `DV ${id}`, departDate, pax: P(guests) });
  assert.deepEqual(confirmGaps([s("a", "2026-09-19"), s("b", "2027-09-19")], today), []); // hai đầu khoảng đều được
  assert.deepEqual(confirmGaps([s("a", null), s("b", "2026-09-18"), s("c", "2027-09-20"), s("d", "2026-10-01", 0), s("e", null, 0)], today), [
    { serviceId: "a", name: "DV a", reasons: ["no_date"] },
    { serviceId: "b", name: "DV b", reasons: ["past_date"] },
    { serviceId: "c", name: "DV c", reasons: ["too_far"] },
    { serviceId: "d", name: "DV d", reasons: ["no_guests"] },
    { serviceId: "e", name: "DV e", reasons: ["no_date", "no_guests"] },
  ]);
});

// ---- trạng thái so với danh mục hiện tại ----
test("catalogStatusOf: nhập tay = null; ẩn/mất/đổi đơn vị = unavailable; đổi giá = price_changed", () => {
  const svc = { catalogCode: "TD101", unit: "perPax", items: stored.items };
  assert.equal(catalogStatusOf({ ...svc, catalogCode: null }, tour), null);
  assert.equal(catalogStatusOf(svc, undefined), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, visible: false }), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, unit: "per5Pax" }), "unavailable");
  assert.equal(catalogStatusOf(svc, { ...tour, prices: { ...tour.prices, child: 600000 } }), "price_changed");
  assert.equal(catalogStatusOf(svc, tour), "ok");
});

// ---- sửa trường vận hành (Q9) ----
test("sửa trường vận hành: đơn nháp không kiểm khoảng ngày; xác nhận thì không xoá ngày và ngày ĐỔI phải trong khoảng", () => {
  const today = "2026-09-19";
  const cur = [{ id: "a", departDate: "2026-09-10" }, { id: "b", departDate: "2026-10-01" }];
  const input = (services: unknown[]) => ({ expectedUpdatedAt: "2026-09-19T01:00:00.000Z", services });
  // nháp: ngày quá khứ, bỏ trống ngày đều được
  assert.ok(validateTripUpdate(input([{ id: "a", departDate: "2020-01-01" }, { id: "b" }]), cur, "draft", today).ok);
  // xác nhận: giữ nguyên ngày đã qua để sửa ghi chú → được
  const keep = validateTripUpdate(input([{ id: "a", departDate: "2026-09-10", note: "đã đi rồi" }]), cur, "confirmed", today);
  assert.ok(keep.ok);
  assert.equal(keep.ok && keep.value.updates[0]!.trip.note, "đã đi rồi");
  // xác nhận: đổi sang quá khứ / quá xa / xoá ngày → chặn
  assert.match((validateTripUpdate(input([{ id: "b", departDate: "2026-09-18" }]), cur, "confirmed", today) as { message: string }).message, /từ 2026-09-19 đến 2027-09-19/);
  assert.ok(!validateTripUpdate(input([{ id: "b", departDate: "2027-09-20" }]), cur, "confirmed", today).ok);
  assert.match((validateTripUpdate(input([{ id: "b" }]), cur, "confirmed", today) as { message: string }).message, /phải có ngày khởi hành/);
  assert.ok(validateTripUpdate(input([{ id: "b", departDate: "2026-09-19" }]), cur, "confirmed", today).ok); // đầu khoảng
});

test("sửa trường vận hành: kiểm đầu vào (expectedUpdatedAt, id thuộc đơn, không trùng, trường chuyến hợp lệ)", () => {
  const cur = [{ id: "a", departDate: "2026-10-01" }];
  const msg = (v: unknown) => {
    const r = validateTripUpdate(v, cur, "draft", "2026-09-19");
    assert.ok(!r.ok);
    return r.message;
  };
  assert.match(msg(null), /không hợp lệ/);
  assert.match(msg({ services: [{ id: "a" }] }), /expectedUpdatedAt/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [] }), /ít nhất một dịch vụ/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "zzz" }] }), /không thuộc đơn này/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "a" }, { id: "a" }] }), /trùng/);
  assert.match(msg({ expectedUpdatedAt: "x", services: [{ id: "a", departTime: "24:00" }] }), /giờ khởi hành/);
  assert.match(msg({ expectedUpdatedAt: "x", services: Array.from({ length: 21 }, () => ({ id: "a" })) }), /Tối đa 20/);
});

// ---- mô tả cho nhật ký ----
test("summarizeDeviations: chỉ dòng lệch giá, gọn, không có dữ liệu cá nhân", () => {
  const line = (over: object) => ({ catalogCode: "TD101", paxCode: "adult" as const, unitPrice: 800000, catalogPrice: 850000, ...over });
  assert.equal(summarizeDeviations([line({}), line({ unitPrice: 850000 }), line({ catalogCode: null, catalogPrice: null })]), "lệch giá danh mục: TD101 người lớn 850.000 ₫ → 800.000 ₫");
  assert.equal(summarizeDeviations([line({ unitPrice: 850000 })]), undefined);
  assert.equal(summarizeDeviations([]), undefined);
  const many = summarizeDeviations(Array.from({ length: 8 }, (_, i) => line({ catalogCode: `T${i}` })), 3)!;
  assert.match(many, /… và 5 dòng khác$/);
  assert.equal(many.split(";").length, 4);
});

test("describeTripChange: ngày/giờ ghi trước → sau, địa điểm và ghi chú chỉ ghi 'đổi' (không lộ dữ liệu cá nhân)", () => {
  const before = { departDate: "2026-09-25", departTime: null, pickupTime: "06:30", pickupPlace: "KS Novotel, phòng 1205", checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
  const after = { ...before, departDate: "2026-09-26", departTime: "08:00", pickupTime: null, pickupPlace: "Sân bay Cam Ranh", note: "ăn chay" };
  const s = describeTripChange("Tour 3 đảo", before, after)!;
  assert.equal(s, "Tour 3 đảo: ngày khởi hành 2026-09-25 → 2026-09-26, giờ khởi hành (trống) → 08:00, giờ đón 06:30 → (trống), đổi điểm đón, đổi ghi chú");
  assert.ok(!s.includes("Novotel") && !s.includes("Cam Ranh") && !s.includes("ăn chay"));
  assert.equal(describeTripChange("X", before, { ...before }), null);
});

test("describeTripUpdates: gộp nhiều dịch vụ; không đổi gì → null; id lạ bị bỏ qua", () => {
  const t = { departDate: "2026-09-25", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null };
  const cur = [{ id: "a", name: "A", trip: t }, { id: "b", name: "B", trip: t }];
  assert.equal(describeTripUpdates(cur, [{ id: "a", trip: t }, { id: "b", trip: t }]), null);
  assert.equal(describeTripUpdates(cur, [{ id: "a", trip: { ...t, departTime: "07:00" } }, { id: "b", trip: { ...t, note: "x" } }, { id: "zzz", trip: t }]), "A: giờ khởi hành (trống) → 07:00 | B: đổi ghi chú");
});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/modules/orders/service-rules.test.ts
```

Expected: FAIL — `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '…/src/modules/orders/service-rules.ts'`.

- [ ] **Bước 3: Cài đặt** — tạo `src/modules/orders/fields.ts`

```ts
// Bộ đọc trường đầu vào thuần cho luật đơn hàng: chuỗi, số nguyên, ngày, giờ. Không I/O.
import { isHHMM, isISODate } from "../../shared/vn-date.ts";

export type TextField = { value: string | null; error?: string };

/** Chuỗi khách/đơn: chỉ trim. Rỗng → null (hoặc lỗi nếu bắt buộc). */
export function text(v: unknown, label: string, max: number, required: boolean): TextField {
  if (v === undefined || v === null || v === "") return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const s = v.trim();
  if (!s) return required ? { value: null, error: `${label} là bắt buộc.` } : { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

/** Số tiền/số lượng phải là số nguyên (kiểu number, không nhận chuỗi) trong khoảng cho phép. */
export function int(v: unknown, label: string, min: number, max: number, fallback?: number): { value: number; error?: string } {
  if ((v === undefined || v === null) && fallback !== undefined) return { value: fallback };
  if (typeof v !== "number" || !Number.isSafeInteger(v)) return { value: 0, error: `${label} phải là số nguyên.` };
  if (v < min || v > max) return { value: 0, error: `${label} phải từ ${min} đến ${max}.` };
  return { value: v };
}

const CONTROL_KEEP_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/g;
const CONTROL_ALL = /[\u0000-\u001f\u007f]/g;

/**
 * Chuỗi tự do đi vào PNG/PDF (điểm đón, nơi check-in, ghi chú): bỏ ký tự điều khiển như booking (`schema.ts` của tourdaovn),
 * để xuống dòng giả không chen vào mẫu xuất. `multiline` = true chỉ giữ dấu xuống dòng; false gộp mọi khoảng trắng thành một dấu cách.
 */
export function cleanText(v: unknown, label: string, max: number, multiline: boolean): TextField {
  if (v === undefined || v === null) return { value: null };
  if (typeof v !== "string") return { value: null, error: `${label} không hợp lệ.` };
  const unified = v.replace(/\r\n?/g, "\n");
  const s = (multiline ? unified.replace(CONTROL_KEEP_NEWLINE, " ") : unified.replace(CONTROL_ALL, " ").replace(/\s+/g, " ")).trim();
  if (!s) return { value: null };
  if (s.length > max) return { value: null, error: `${label} tối đa ${max} ký tự.` };
  return { value: s };
}

/** Ngày YYYY-MM-DD đúng lịch. Rỗng/vắng → null. */
export function dateField(v: unknown, label: string): TextField {
  if (v === undefined || v === null || v === "") return { value: null };
  if (typeof v !== "string" || !isISODate(v.trim())) return { value: null, error: `${label} không hợp lệ (định dạng YYYY-MM-DD).` };
  return { value: v.trim() };
}

/** Giờ HH:MM từ 00:00 đến 23:59. Rỗng/vắng → null. */
export function timeField(v: unknown, label: string): TextField {
  if (v === undefined || v === null || v === "") return { value: null };
  if (typeof v !== "string" || !isHHMM(v.trim())) return { value: null, error: `${label} không hợp lệ (định dạng HH:MM).` };
  return { value: v.trim() };
}
```

Tạo `src/modules/orders/service-rules.ts`:

```ts
// Luật thuần cho MỘT dịch vụ trong đơn (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md §4.2):
// số khách, thông tin chuyến, dòng tiền do MÁY CHỦ sinh, bản chụp cho nháp cũ, điều kiện xác nhận, sửa trường vận hành. Không I/O.
import type { CatalogChangeDto, CatalogStatus, MissingReason, TripGapDto, TripInfoDto } from "../../shared/contracts.ts";
import {
  CATALOG_CODE_RE, MAX_AMOUNT_VND, MAX_GUESTS_PER_SERVICE, PAX_LABEL, PAX_ORDER, buildLines, paxTotal, payingGuests, priceDeviation,
  type CatalogService, type EffectiveService, type PaxCode, type PaxCounts, type Prices,
} from "../../shared/order-lines.ts";
import { addDays } from "../../shared/vn-date.ts";
import { cleanText, dateField, int, text, timeField } from "./fields.ts";

export type { CatalogChangeDto as CatalogChange, CatalogStatus, MissingReason, TripGapDto as TripGap };

export const MAX_SERVICES = 20;
/** Tổng số dòng tiền của một đơn (cũng là trần số dòng nhập tay của một dịch vụ). */
export const MAX_LINES_PER_ORDER = 50;
/** Xác nhận đơn: ngày khởi hành không quá khứ và không xa hơn số ngày này (Q12). */
export const MAX_DAYS_AHEAD = 365;
const MAX_QUANTITY = 100_000;

/** Thông tin chuyến đã chuẩn hoá (rỗng → null). Cùng hình dạng với DTO trả ra. */
export type ValidTrip = TripInfoDto;

export interface ValidItem {
  /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. Chỉ để truy vết. */
  catalogCode: string | null;
  /** Loại khách của dòng; null = nhập tay. */
  paxCode: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unitPrice: number;
  /** Giá danh mục hiệu lực lúc lập dòng; null = nhập tay. */
  catalogPrice: number | null;
  lineTotal: number;
}

export interface ValidService {
  /** id của dịch vụ đã lưu mà đầu vào này trỏ tới (giữ id ổn định qua các lần sửa); null = dịch vụ mới. */
  id: string | null;
  kind: "catalog" | "manual";
  catalogCode: string | null;
  name: string;
  /** Chuỗi đơn vị của Sheet lúc lập; "manual" = nhập tay. */
  unit: string;
  pax: PaxCounts;
  trip: ValidTrip;
  items: ValidItem[];
}

/** Dịch vụ đã lưu của đơn đang sửa (từ D1), đủ để dựng lại "bản chụp". */
export interface StoredService {
  id: string;
  catalogCode: string | null;
  name: string;
  unit: string;
  pax: PaxCounts;
  items: { paxCode: PaxCode | null; detail: string | null; catalogPrice: number | null }[];
}

export interface ServiceContext {
  /** Danh mục hiệu lực theo mã (kể cả dịch vụ đang ẩn — có cờ `visible`). */
  catalog: ReadonlyMap<string, EffectiveService>;
  stored: readonly StoredService[];
}

export type ServiceFailure = { ok: false; message: string; code?: "catalog_changed" | "catalog_unavailable"; details?: unknown };
export type ServiceResult = { ok: true; value: ValidService } | ServiceFailure;

const fail = (message: string, extra: Omit<ServiceFailure, "ok" | "message"> = {}): ServiceFailure => ({ ok: false, message, ...extra });

// ---- Thông tin chuyến --------------------------------------------------------------------------------------------

export type TripResult = { ok: true; value: ValidTrip } | ServiceFailure;

export function validateTrip(s: Record<string, unknown>, at: string): TripResult {
  const departDate = dateField(s.departDate, `${at}: ngày khởi hành`);
  const departTime = timeField(s.departTime, `${at}: giờ khởi hành`);
  const pickupTime = timeField(s.pickupTime, `${at}: giờ đón`);
  const pickupPlace = cleanText(s.pickupPlace, `${at}: điểm đón`, 200, false);
  const checkinDate = dateField(s.checkinDate, `${at}: ngày check-in`);
  const checkinTime = timeField(s.checkinTime, `${at}: giờ check-in`);
  const checkinPlace = cleanText(s.checkinPlace, `${at}: nơi check-in`, 200, false);
  const note = cleanText(s.note, `${at}: ghi chú`, 1000, true);
  const bad = [departDate, departTime, pickupTime, pickupPlace, checkinDate, checkinTime, checkinPlace, note].find((f) => f.error);
  if (bad) return fail(bad.error!);
  return {
    ok: true,
    value: {
      departDate: departDate.value, departTime: departTime.value, pickupTime: pickupTime.value, pickupPlace: pickupPlace.value,
      checkinDate: checkinDate.value, checkinTime: checkinTime.value, checkinPlace: checkinPlace.value, note: note.value,
    },
  };
}

// ---- Số khách và bảng giá ----------------------------------------------------------------------------------------

function validatePax(v: unknown, at: string): { ok: true; value: PaxCounts } | ServiceFailure {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail(`${at}: thiếu số khách.`);
  const o = v as Record<string, unknown>;
  const value: PaxCounts = { adult: 0, child: 0, senior: 0, infant: 0 };
  for (const c of PAX_ORDER) {
    const r = int(o[c], `${at}: số khách ${PAX_LABEL[c].toLowerCase()}`, 0, MAX_GUESTS_PER_SERVICE, 0);
    if (r.error) return fail(r.error);
    value[c] = r.value;
  }
  if (paxTotal(value) > MAX_GUESTS_PER_SERVICE) return fail(`${at}: tối đa ${MAX_GUESTS_PER_SERVICE} khách mỗi dịch vụ.`);
  return { ok: true, value };
}

function priceMap(v: unknown, label: string): { ok: true; value: Partial<Record<PaxCode, number>> } | ServiceFailure {
  if (v === undefined || v === null) return { ok: true, value: {} };
  if (typeof v !== "object" || Array.isArray(v)) return fail(`${label} không hợp lệ.`);
  const out: Partial<Record<PaxCode, number>> = {};
  for (const [k, n] of Object.entries(v)) {
    if (!PAX_ORDER.includes(k as PaxCode)) return fail(`${label}: loại khách "${k}" không hợp lệ.`);
    const r = int(n, `${label} ${PAX_LABEL[k as PaxCode].toLowerCase()}`, 0, MAX_AMOUNT_VND);
    if (r.error) return fail(r.error);
    out[k as PaxCode] = r.value;
  }
  return { ok: true, value: out };
}

const samePax = (a: PaxCounts, b: PaxCounts): boolean => PAX_ORDER.every((c) => a[c] === b[c]);

/**
 * Dựng lại dịch vụ danh mục từ những gì đã lưu (Q11: nháp cũ giữ bản chụp). Trả null nếu dòng đã lưu thiếu loại khách / giá danh mục
 * (không dùng được) — khi đó dịch vụ được xử lý như dịch vụ mới.
 */
export function snapshotService(st: StoredService): CatalogService | null {
  if (st.catalogCode === null || st.items.length === 0) return null;
  const prices: Prices = { adult: null, child: null, senior: null, infant: null };
  const notes: CatalogService["notes"] = { child: null, senior: null, infant: null };
  for (const it of st.items) {
    if (it.paxCode === null || it.catalogPrice === null) return null;
    prices[it.paxCode] = it.catalogPrice;
    if (it.paxCode !== "adult") notes[it.paxCode] = it.detail;
  }
  return { code: st.catalogCode, name: st.name, unit: st.unit, prices, notes };
}

// ---- Dịch vụ từ danh mục -----------------------------------------------------------------------------------------

function catalogService(s: Record<string, unknown>, at: string, index: number, pax: PaxCounts, trip: ValidTrip, ctx: ServiceContext): ServiceResult {
  const code = s.catalogCode;
  if (typeof code !== "string" || !CATALOG_CODE_RE.test(code)) return fail(`${at}: mã dịch vụ không hợp lệ.`);
  const prices = priceMap(s.unitPrices, `${at}: đơn giá`);
  if (!prices.ok) return prices;
  const seen = priceMap(s.catalogPriceSeen, `${at}: giá danh mục đã xem`);
  if (!seen.ok) return seen;
  if (payingGuests(pax) < 1) return fail(`${at}: cần ít nhất 1 khách không phải em bé.`);
  for (const c of Object.keys(prices.value) as PaxCode[]) {
    if (pax[c] === 0) return fail(`${at}: có đơn giá cho ${PAX_LABEL[c].toLowerCase()} nhưng không có khách loại này.`);
  }

  // Q11: dịch vụ đã lưu của CHÍNH đơn này, cùng mã và cùng số khách → giữ bản chụp, không tra danh mục (dịch vụ đã ẩn/đổi giá vẫn sửa được).
  const stored = typeof s.id === "string" ? ctx.stored.find((x) => x.id === s.id) : undefined;
  const kept = stored && stored.catalogCode === code && samePax(stored.pax, pax) ? snapshotService(stored) : null;

  let source: CatalogService;
  if (kept) source = kept;
  else {
    const eff = ctx.catalog.get(code);
    if (!eff || !eff.visible) return fail(`${at}: dịch vụ ${code} không còn trong danh mục — hãy chọn dịch vụ khác hoặc nhập tay.`, { code: "catalog_unavailable" });
    source = eff;
  }

  const built = buildLines(source, pax, prices.value);
  if (!built.ok) return fail(`${at}: ${built.message}`);

  if (!kept) {
    // BK5 (nửa sau): giá danh mục mà form đã hiển thị phải còn đúng lúc lưu, không thì báo khách một giá còn đơn lưu giá khác trong im lặng.
    const changes: CatalogChangeDto[] = [];
    for (const l of built.lines) {
      const s0 = seen.value[l.pax];
      if (s0 === undefined) return fail(`${at}: thiếu giá danh mục đã xem cho ${PAX_LABEL[l.pax].toLowerCase()}.`);
      if (s0 !== l.catalogPrice) changes.push({ serviceIndex: index, catalogCode: code, pax: l.pax, seen: s0, current: l.catalogPrice });
    }
    if (changes.length) return fail(`${at}: giá danh mục vừa thay đổi, hãy xem lại giá rồi lưu.`, { code: "catalog_changed", details: changes });
  }

  const items: ValidItem[] = [];
  for (const l of built.lines) {
    const lineTotal = l.quantity * l.unitPrice;
    if (lineTotal > MAX_AMOUNT_VND) return fail(`${at}: thành tiền vượt giới hạn.`);
    items.push({ catalogCode: code, paxCode: l.pax, description: l.description, detail: l.detail || null, quantity: l.quantity, unitPrice: l.unitPrice, catalogPrice: l.catalogPrice, lineTotal });
  }
  return { ok: true, value: { id: stored?.id ?? null, kind: "catalog", catalogCode: code, name: source.name, unit: source.unit, pax, trip, items } };
}

// ---- Dịch vụ nhập tay --------------------------------------------------------------------------------------------

function manualService(s: Record<string, unknown>, at: string, pax: PaxCounts, trip: ValidTrip, ctx: ServiceContext): ServiceResult {
  const name = text(s.name, `${at}: tên dịch vụ`, 300, true);
  if (name.error) return fail(name.error);
  if (!Array.isArray(s.items) || s.items.length === 0) return fail(`${at}: cần ít nhất một dòng tiền.`);
  if (s.items.length > MAX_LINES_PER_ORDER) return fail(`${at}: tối đa ${MAX_LINES_PER_ORDER} dòng tiền.`);
  const items: ValidItem[] = [];
  for (const [i, raw] of s.items.entries()) {
    const line = `${at}, dòng ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${line} không hợp lệ.`);
    const it = raw as Record<string, unknown>;
    const description = text(it.description, `${line}: mô tả`, 300, true);
    if (description.error) return fail(description.error);
    const detail = text(it.detail, `${line}: chi tiết`, 1000, false);
    if (detail.error) return fail(detail.error);
    const quantity = int(it.quantity, `${line}: số lượng`, 1, MAX_QUANTITY, 1);
    if (quantity.error) return fail(quantity.error);
    const unitPrice = int(it.unitPrice, `${line}: đơn giá`, 0, MAX_AMOUNT_VND);
    if (unitPrice.error) return fail(unitPrice.error);
    const lineTotal = quantity.value * unitPrice.value;
    if (lineTotal > MAX_AMOUNT_VND) return fail(`${line}: thành tiền vượt giới hạn.`);
    items.push({ catalogCode: null, paxCode: null, description: description.value!, detail: detail.value, quantity: quantity.value, unitPrice: unitPrice.value, catalogPrice: null, lineTotal });
  }
  const stored = typeof s.id === "string" ? ctx.stored.find((x) => x.id === s.id) : undefined;
  return { ok: true, value: { id: stored?.id ?? null, kind: "manual", catalogCode: null, name: name.value!, unit: "manual", pax, trip, items } };
}

export function validateService(raw: unknown, index: number, ctx: ServiceContext): ServiceResult {
  const at = `Dịch vụ ${index + 1}`;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return fail(`${at} không hợp lệ.`);
  const s = raw as Record<string, unknown>;
  if (s.kind !== "catalog" && s.kind !== "manual") return fail(`${at}: loại dịch vụ không hợp lệ.`);
  const trip = validateTrip(s, at);
  if (!trip.ok) return trip;
  const pax = validatePax(s.pax, at);
  if (!pax.ok) return pax;
  return s.kind === "catalog" ? catalogService(s, at, index, pax.value, trip.value, ctx) : manualService(s, at, pax.value, trip.value, ctx);
}

// ---- Xác nhận đơn (Q4 + Q12) -------------------------------------------------------------------------------------

/** Khoảng ngày khởi hành cho phép khi xác nhận (bao gồm hai đầu). Repository bind hai giá trị này vào câu UPDATE xác nhận. */
export const confirmWindow = (today: string): { from: string; to: string } => ({ from: today, to: addDays(today, MAX_DAYS_AHEAD) });

/** Dịch vụ nào chưa đủ điều kiện xác nhận. Mảng rỗng = xác nhận được. */
export function confirmGaps(services: readonly { id: string; name: string; departDate: string | null; pax: PaxCounts }[], today: string): TripGapDto[] {
  const { from, to } = confirmWindow(today);
  const gaps: TripGapDto[] = [];
  for (const sv of services) {
    const reasons: MissingReason[] = [];
    if (!sv.departDate) reasons.push("no_date");
    else if (sv.departDate < from) reasons.push("past_date");
    else if (sv.departDate > to) reasons.push("too_far");
    if (paxTotal(sv.pax) < 1) reasons.push("no_guests");
    if (reasons.length) gaps.push({ serviceId: sv.id, name: sv.name, reasons });
  }
  return gaps;
}

// ---- Trạng thái so với danh mục hiện tại (chỉ để hiển thị cho đơn nháp) -----------------------------------------------

export function catalogStatusOf(
  svc: { catalogCode: string | null; unit: string; items: { paxCode: PaxCode | null; catalogPrice: number | null }[] },
  eff: EffectiveService | undefined,
): CatalogStatus | null {
  if (svc.catalogCode === null) return null;
  if (!eff || !eff.visible || eff.unit !== svc.unit) return "unavailable";
  for (const it of svc.items) if (it.paxCode !== null && it.catalogPrice !== null && eff.prices[it.paxCode] !== it.catalogPrice) return "price_changed";
  return "ok";
}

// ---- Sửa trường vận hành (Q9) ----------------------------------------------------------------------------------

export interface TripUpdate {
  expectedUpdatedAt: string;
  updates: { id: string; trip: ValidTrip }[];
}
export type TripUpdateResult = { ok: true; value: TripUpdate } | { ok: false; message: string };

/**
 * `PUT /api/orders/:id/trip`. Đơn nháp: trường nào cũng tuỳ chọn, không kiểm khoảng ngày (Q12: nháp luôn lưu được).
 * Đơn đã xác nhận: ngày khởi hành không được xoá; nếu ĐỔI ngày thì ngày mới phải trong khoảng cho phép (ghi chú chuyến đã đi vẫn sửa được).
 */
export function validateTripUpdate(
  input: unknown,
  stored: readonly { id: string; departDate: string | null }[],
  status: "draft" | "confirmed",
  today: string,
): TripUpdateResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) return { ok: false, message: "Dữ liệu không hợp lệ." };
  const b = input as Record<string, unknown>;
  if (typeof b.expectedUpdatedAt !== "string" || !b.expectedUpdatedAt) return { ok: false, message: "Thiếu expectedUpdatedAt." };
  if (!Array.isArray(b.services) || b.services.length === 0) return { ok: false, message: "Cần ít nhất một dịch vụ để cập nhật." };
  if (b.services.length > MAX_SERVICES) return { ok: false, message: `Tối đa ${MAX_SERVICES} dịch vụ.` };
  const { from, to } = confirmWindow(today);
  const seen = new Set<string>();
  const updates: TripUpdate["updates"] = [];
  for (const [i, raw] of b.services.entries()) {
    const at = `Dịch vụ ${i + 1}`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: `${at} không hợp lệ.` };
    const s = raw as Record<string, unknown>;
    const cur = typeof s.id === "string" ? stored.find((x) => x.id === s.id) : undefined;
    if (!cur) return { ok: false, message: `${at}: không thuộc đơn này.` };
    if (seen.has(cur.id)) return { ok: false, message: `${at}: trùng dịch vụ.` };
    seen.add(cur.id);
    const trip = validateTrip(s, at);
    if (!trip.ok) return { ok: false, message: trip.message };
    if (status === "confirmed") {
      const d = trip.value.departDate;
      if (!d) return { ok: false, message: `${at}: đơn đã xác nhận phải có ngày khởi hành.` };
      if (d !== cur.departDate && (d < from || d > to)) return { ok: false, message: `${at}: ngày khởi hành phải từ ${from} đến ${to}.` };
    }
    updates.push({ id: cur.id, trip: trip.value });
  }
  return { ok: true, value: { expectedUpdatedAt: b.expectedUpdatedAt, updates } };
}

// ---- Mô tả cho nhật ký -------------------------------------------------------------------------------------------
// Nhật ký KHÔNG ghi giá trị chuỗi tự do (điểm đón, nơi check-in, ghi chú là dữ liệu cá nhân của khách) — chỉ ghi "đổi".

const vnd = (n: number): string => `${n.toLocaleString("vi-VN")} ₫`;

/** "lệch giá danh mục: TD101 người lớn 850.000 ₫ → 800.000 ₫; …" — chỉ mã dịch vụ, loại khách, số tiền. undefined nếu không dòng nào lệch. */
export function summarizeDeviations(
  items: readonly { catalogCode: string | null; paxCode: PaxCode | null; unitPrice: number; catalogPrice: number | null }[],
  maxLines = 5,
): string | undefined {
  const dev = items.filter((i) => priceDeviation(i) !== null);
  if (dev.length === 0) return undefined;
  const shown = dev.slice(0, maxLines).map((i) => `${i.catalogCode ?? "?"} ${i.paxCode ? PAX_LABEL[i.paxCode].toLowerCase() : ""} ${vnd(i.catalogPrice!)} → ${vnd(i.unitPrice)}`.replace(/\s+/g, " "));
  const more = dev.length > maxLines ? [`… và ${dev.length - maxLines} dòng khác`] : [];
  return `lệch giá danh mục: ${[...shown, ...more].join("; ")}`;
}

const TRIP_VALUE_FIELDS = [
  ["departDate", "ngày khởi hành"], ["departTime", "giờ khởi hành"], ["pickupTime", "giờ đón"], ["checkinDate", "ngày check-in"], ["checkinTime", "giờ check-in"],
] as const;
const TRIP_TEXT_FIELDS = [["pickupPlace", "điểm đón"], ["checkinPlace", "nơi check-in"], ["note", "ghi chú"]] as const;

/** Thay đổi chuyến của một dịch vụ: ngày/giờ ghi "trước → sau", địa điểm/ghi chú chỉ ghi "đổi". null = không đổi gì. */
export function describeTripChange(name: string, before: ValidTrip, after: ValidTrip): string | null {
  const parts: string[] = [];
  for (const [k, label] of TRIP_VALUE_FIELDS) if (before[k] !== after[k]) parts.push(`${label} ${before[k] ?? "(trống)"} → ${after[k] ?? "(trống)"}`);
  for (const [k, label] of TRIP_TEXT_FIELDS) if (before[k] !== after[k]) parts.push(`đổi ${label}`);
  return parts.length ? `${name}: ${parts.join(", ")}` : null;
}

/** Gộp thay đổi của nhiều dịch vụ thành một dòng nhật ký. null = không có gì đổi (route khỏi ghi). */
export function describeTripUpdates(stored: readonly { id: string; name: string; trip: ValidTrip }[], updates: readonly { id: string; trip: ValidTrip }[]): string | null {
  const lines = updates.flatMap((u) => {
    const cur = stored.find((s) => s.id === u.id);
    const d = cur ? describeTripChange(cur.name, cur.trip, u.trip) : null;
    return d ? [d] : [];
  });
  return lines.length ? lines.join(" | ") : null;
}
```

Thêm kiểu vào `src/shared/contracts.ts` (chỉ thêm; `OrderItemDto`, `OrderDetailDto`, `OrderInput` cũ **chưa đổi** để repository hiện tại còn biên dịch):

```diff
--- a/src/shared/contracts.ts
+++ b/src/shared/contracts.ts
@@ -1,9 +1,9 @@
 // HỢP ĐỒNG API giữa Worker và giao diện (web/). Chỉ chứa kiểu — không có mã chạy.
 // Server khai kiểu trả về theo file này (và `satisfies` ở chỗ trả JSON); web/api.ts re-export. Đổi một bên mà quên bên kia → typecheck báo.
 import type { AuditAction, AuditTargetType } from "./audit-actions.ts";
-import type { CatalogService, PaxCode, Prices } from "./order-lines.ts";
+import type { CatalogService, PaxCode, PaxCounts, Prices } from "./order-lines.ts";
 
-export type { AuditAction, AuditTargetType, CatalogService, PaxCode, Prices };
+export type { AuditAction, AuditTargetType, CatalogService, PaxCode, PaxCounts, Prices };
 
 // ---- Nhân viên / phiên -------------------------------------------------------
 export type StaffRole = "sales" | "admin";
@@ -60,6 +60,37 @@
   lineTotal: number;
 }
 
+/** So với danh mục hiện tại — chỉ tính cho đơn nháp, dịch vụ từ danh mục. */
+export type CatalogStatus = "ok" | "price_changed" | "unavailable";
+export type MissingReason = "no_date" | "past_date" | "too_far" | "no_guests";
+export interface TripGapDto { serviceId: string; name: string; reasons: MissingReason[] }
+export interface CatalogChangeDto { serviceIndex: number; catalogCode: string; pax: PaxCode; seen: number; current: number }
+
+/** Thông tin chuyến của một dịch vụ (ngày YYYY-MM-DD, giờ HH:MM theo giờ Việt Nam). */
+export interface TripInfoDto {
+  departDate: string | null;
+  departTime: string | null;
+  pickupTime: string | null;
+  pickupPlace: string | null;
+  /** null = cùng ngày khởi hành. */
+  checkinDate: string | null;
+  checkinTime: string | null;
+  checkinPlace: string | null;
+  note: string | null;
+}
+
+export interface OrderServiceDto extends TripInfoDto {
+  id: string;
+  kind: "catalog" | "manual";
+  catalogCode: string | null;
+  name: string;
+  /** Chuỗi đơn vị của Sheet lúc lập đơn; "manual" = nhập tay. */
+  unit: string;
+  pax: PaxCounts;
+  items: OrderItemDto[];
+  catalogStatus: CatalogStatus | null;
+}
+
 export interface OrderDto {
   id: string;
   orderCode: string;
@@ -91,6 +122,35 @@
   "id" | "orderCode" | "status" | "customerName" | "customerPhone" | "total" | "remainingAmount" | "staffName" | "createdAt"
 >;
 
+/** Thông tin chuyến client gửi lên: "" = chưa có. */
+export interface TripInput {
+  departDate: string;
+  departTime: string;
+  pickupTime: string;
+  pickupPlace: string;
+  checkinDate: string;
+  checkinTime: string;
+  checkinPlace: string;
+  note: string;
+}
+
+/**
+ * Một dịch vụ trong đơn. `catalog`: chỉ gửi mã + số khách + đơn giá thực tế; dòng tiền do MÁY CHỦ sinh (không nhận số lượng từ client).
+ * `id` = dịch vụ đã lưu của chính đơn này (giữ bản chụp nếu mã và số khách không đổi).
+ */
+export type ServiceInput = { id?: string; pax: PaxCounts } & TripInput &
+  (
+    | {
+        kind: "catalog";
+        catalogCode: string;
+        /** Đơn giá thực tế từng loại có khách (mặc định giao diện = giá danh mục); vắng = giá danh mục. */
+        unitPrices: Partial<Record<PaxCode, number>>;
+        /** Giá danh mục mà form đang hiển thị; lệch giá hiện tại → 409 `catalog_changed`. */
+        catalogPriceSeen: Partial<Record<PaxCode, number>>;
+      }
+    | { kind: "manual"; name: string; items: { description: string; detail: string; quantity: number; unitPrice: number }[] }
+  );
+
 /** Dữ liệu client gửi lên khi tạo/sửa đơn: chỉ các trường nhập, KHÔNG có số dẫn xuất — server tự tính (§2.3). */
 export interface OrderInput {
   customerName: string;
@@ -104,6 +164,16 @@
   paymentNote: string;
 }
 
+/** `PUT /api/orders/:id/trip` — sửa trường vận hành (đơn nháp hoặc đã xác nhận). */
+export interface TripUpdateInput {
+  expectedUpdatedAt: string;
+  services: ({ id: string } & TripInput)[];
+}
+
+/** Thân lỗi có thêm dữ liệu: 409 `incomplete_trip` (xác nhận thiếu chuyến) và 409 `catalog_changed` (giá danh mục vừa đổi). */
+export interface IncompleteTripBody { error: { code: "incomplete_trip"; message: string; missing: TripGapDto[] } }
+export interface CatalogChangedBody { error: { code: "catalog_changed"; message: string; changes: CatalogChangeDto[] } }
+
 export interface OrderListResponse { orders: OrderSummaryDto[]; hasMore: boolean }
 export interface OrderResponse { order: OrderDetailDto }
 export interface OrderDetailResponse { order: OrderDetailDto; history: AuditEntryDto[]; canModify: boolean }
```

Thêm hành động nhật ký vào `src/shared/audit-actions.ts`:

```diff
--- a/src/shared/audit-actions.ts
+++ b/src/shared/audit-actions.ts
@@ -13,6 +13,7 @@
 export const AUDIT_ACTIONS = {
   created: { label: "Tạo đơn", group: "order" },
   updated: { label: "Sửa đơn", group: "order" },
+  trip_updated: { label: "Sửa thông tin chuyến", group: "order" },
   confirmed: { label: "Xác nhận đơn", group: "order" },
   cancelled: { label: "Huỷ đơn", group: "order" },
   exported_png: { label: "Xuất PNG", group: "order" },
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
npm test && npx tsc --noEmit && npx tsc --noEmit -p web
```

Expected: `service-rules.test.ts` 24/24; `# tests 85`, `# pass 85` (test `audit-actions` vẫn xanh: mã mới có nhãn và nhóm hợp lệ); hai `tsc` không lỗi.

- [ ] **Bước 5: Commit**

```bash
git add src/modules/orders/fields.ts src/modules/orders/service-rules.ts src/modules/orders/service-rules.test.ts src/shared/contracts.ts src/shared/audit-actions.ts
git commit -m "orders: luật thuần cho một dịch vụ (khách, chuyến, dòng tiền do máy chủ sinh, bản chụp, điều kiện xác nhận)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 6: `validateOrder(input, ctx)` nhận danh sách dịch vụ (`orders/rules.ts`)

**Files:**
- Modify: `src/modules/orders/rules.ts` (thay toàn bộ), `src/modules/orders/index.ts` (**shim tạm**, hai dòng)
- Test: `src/modules/orders/rules.test.ts` (thay toàn bộ)

**Interfaces:**
- Consumes: Task 1 (`vnToday`), Task 5 (`validateService`, `ServiceContext`, `ValidService`, `ValidItem`, `MAX_SERVICES`, `MAX_LINES_PER_ORDER`, `int`, `text`).
- Produces:
  - `validateOrder(input: unknown, ctx: ServiceContext): Validated`; `Validated = { ok: true; value: ValidOrder } | Failure`; `Failure = { ok: false; message; code?: "catalog_changed" | "catalog_unavailable" | "client_outdated"; details? }`.
  - `ValidOrder` = như cũ nhưng thay `items` đầu vào bằng `services: ValidService[]`; **vẫn có `items: ValidItem[]`** (mọi dòng tiền của mọi dịch vụ, theo thứ tự) và `expectedUpdatedAt: string | null`.
  - `orderCodePrefix` dùng `vnToday` (hành vi không đổi).
  - Body có `items` phẳng mà không có `services` → `Failure` với `code: "client_outdated"`.

**Shim tạm:** `orders/index.ts` vẫn gọi `validateOrder` một đối số; sửa hai chỗ thành `validateOrder(await readJson(request), { catalog: new Map(), stored: [] })` cho biên dịch được. Với shim này **tạo đơn từ danh mục chưa chạy được** cho tới Task 8 (danh mục rỗng); e2e chưa chạy ở các task 6–7.

- [ ] **Bước 1: Viết test (ĐỎ)** — thay toàn bộ `src/modules/orders/rules.test.ts`

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import type { EffectiveService } from "../../shared/order-lines.ts";
import { canModify, canTransition, orderCodePrefix, validateOrder, type ServiceContext } from "./rules.ts";

const tour: EffectiveService = {
  code: "TD101", name: "Tour 3 đảo", unit: "perPax", visible: true,
  prices: { adult: 850000, child: 595000, senior: 850000, infant: 0 },
  notes: { child: "Trẻ em cao từ 1 m đến 1,4 mét", senior: null, infant: null },
};
const ctx: ServiceContext = { catalog: new Map([[tour.code, tour]]), stored: [] };

/** Dịch vụ nhập tay: cách gọn nhất để có dòng tiền tự do. */
const manual = (items: unknown[], extra: Record<string, unknown> = {}) => ({ kind: "manual", name: "Dịch vụ", pax: { adult: 1 }, items, ...extra });

const base = {
  customerName: " Nguyễn Văn A ",
  customerPhone: "0901 234 567",
  services: [
    manual([{ description: "Tour Hòn Mun", quantity: 3, unitPrice: 450000 }, { description: "Thuê áo phao", quantity: 1, unitPrice: 50000, detail: "3 cái" }]),
  ],
  discount: 100000,
  depositAmount: 500000,
  depositMethod: "cash",
};

function ok(input: unknown, c: ServiceContext = ctx) {
  const r = validateOrder(input, c);
  assert.ok(r.ok, r.ok ? "" : r.message);
  return r.value;
}
const fails = (input: unknown, c: ServiceContext = ctx) => {
  const r = validateOrder(input, c);
  assert.ok(!r.ok);
  return r;
};
const message = (input: unknown) => fails(input).message;

test("server tự tính line_total, subtotal, total, remaining", () => {
  const v = ok(base);
  assert.deepEqual(v.items.map((i) => i.lineTotal), [1350000, 50000]);
  assert.equal(v.subtotal, 1400000);
  assert.equal(v.total, 1300000);
  assert.equal(v.remainingAmount, 800000);
  assert.equal(v.customerName, "Nguyễn Văn A");
});

test("bỏ qua số dẫn xuất do client gửi (chống gian lận giá)", () => {
  const v = ok({ ...base, total: 1, subtotal: 1, remainingAmount: 0, services: [manual([{ description: "X", quantity: 2, unitPrice: 10, lineTotal: 1 }])], discount: 0, depositAmount: 0 });
  assert.equal(v.total, 20);
  assert.equal(v.items[0]!.lineTotal, 20);
  assert.equal(v.remainingAmount, 20);
});

test("số tiền phải là số nguyên không âm, không nhận chuỗi/thập phân", () => {
  const line = (l: unknown) => ({ ...base, services: [manual([l])] });
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: "100" })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: 10.5 })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 1, unitPrice: -1 })), /đơn giá/);
  assert.match(message(line({ description: "X", quantity: 0, unitPrice: 1 })), /số lượng/);
  assert.match(message({ ...base, discount: -5 }), /Giảm giá/);
});

test("giảm giá ≤ tạm tính, cọc ≤ tổng cộng", () => {
  assert.match(message({ ...base, discount: 1400001 }), /Giảm giá/);
  assert.equal(ok({ ...base, discount: 1400000, depositAmount: 0 }).total, 0);
  assert.match(message({ ...base, depositAmount: 1300001 }), /cọc/);
  assert.equal(ok({ ...base, depositAmount: 1300000 }).remainingAmount, 0);
});

test("có cọc thì cần hình thức cọc; không cọc thì bỏ hình thức", () => {
  assert.match(message({ ...base, depositMethod: undefined }), /hình thức/);
  assert.equal(ok({ ...base, depositAmount: 0, depositMethod: "cash" }).depositMethod, null);
});

test("bắt buộc có khách, SĐT hợp lệ, ít nhất một dịch vụ", () => {
  assert.match(message({ ...base, customerName: "  " }), /Tên khách/);
  assert.match(message({ ...base, customerPhone: "abc" }), /Số điện thoại/);
  assert.match(message({ ...base, customerEmail: "sai" }), /Email/);
  assert.match(message({ ...base, services: [] }), /ít nhất một dịch vụ/);
  assert.match(message({ ...base, services: undefined }), /ít nhất một dịch vụ/);
  assert.match(message(null), /không hợp lệ/);
});

test("dịch vụ từ danh mục: dòng tiền do server sinh và cộng vào tạm tính cùng dịch vụ nhập tay", () => {
  const cat = { kind: "catalog", catalogCode: "TD101", pax: { adult: 2, child: 1 }, catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: "2026-09-25" };
  const v = ok({ ...base, services: [cat, manual([{ description: "Áo phao", quantity: 1, unitPrice: 50000 }])], discount: 0, depositAmount: 0 });
  assert.equal(v.services.length, 2);
  assert.deepEqual(v.items.map((i) => [i.catalogCode, i.quantity, i.unitPrice]), [["TD101", 2, 850000], ["TD101", 1, 595000], [null, 1, 50000]]);
  assert.equal(v.subtotal, 2 * 850000 + 595000 + 50000);
  assert.equal(v.services[0]!.trip.departDate, "2026-09-25");
});

test("lỗi của dịch vụ được chuyển nguyên mã và chi tiết (catalog_changed, catalog_unavailable)", () => {
  const seenWrong = { kind: "catalog", catalogCode: "TD101", pax: { adult: 1 }, catalogPriceSeen: { adult: 1 } };
  const r = fails({ ...base, services: [manual([{ description: "x", quantity: 1, unitPrice: 1 }]), seenWrong] });
  assert.equal(r.code, "catalog_changed");
  assert.deepEqual(r.details, [{ serviceIndex: 1, catalogCode: "TD101", pax: "adult", seen: 1, current: 850000 }]);
  assert.match(r.message, /Dịch vụ 2/);
  assert.equal(fails({ ...base, services: [{ ...seenWrong, catalogCode: "NOPE" }] }).code, "catalog_unavailable");
});

test("giới hạn: ≤ 20 dịch vụ, ≤ 50 dòng tiền, không trùng dịch vụ đã lưu, tổng tiền có trần", () => {
  const one = manual([{ description: "x", quantity: 1, unitPrice: 1 }]);
  assert.match(message({ ...base, services: Array.from({ length: 21 }, () => one), discount: 0, depositAmount: 0 }), /tối đa 20 dịch vụ/);
  ok({ ...base, services: Array.from({ length: 20 }, () => one), discount: 0, depositAmount: 0 });
  const lines = (n: number) => Array.from({ length: n }, (_, i) => ({ description: `d${i}`, quantity: 1, unitPrice: 1 }));
  assert.match(message({ ...base, services: [manual(lines(30)), manual(lines(21))], discount: 0, depositAmount: 0 }), /tối đa 50 dòng tiền/);
  ok({ ...base, services: [manual(lines(30)), manual(lines(20))], discount: 0, depositAmount: 0 });
  const stored = { id: "sv1", catalogCode: null, name: "Dịch vụ", unit: "manual", pax: { adult: 1, child: 0, senior: 0, infant: 0 }, items: [] };
  const withStored: ServiceContext = { catalog: ctx.catalog, stored: [stored] };
  assert.match(fails({ ...base, services: [manual(lines(1), { id: "sv1" }), manual(lines(1), { id: "sv1" })], discount: 0, depositAmount: 0 }, withStored).message, /trùng/);
  const huge = { description: "X", quantity: 99999, unitPrice: 99999999 };
  assert.match(message({ ...base, services: [manual([huge]), manual([huge]), manual([huge]), manual([huge]), manual([huge])], discount: 0, depositAmount: 0 }), /vượt giới hạn/);
});

test("tab cũ gửi items phẳng kiểu cũ → client_outdated", () => {
  const r = fails({ customerName: "A", customerPhone: "0901234567", items: [{ description: "x", quantity: 1, unitPrice: 1 }] });
  assert.equal(r.code, "client_outdated");
});

test("expectedUpdatedAt chuyển tiếp cho PUT; vắng → null", () => {
  assert.equal(ok(base).expectedUpdatedAt, null);
  assert.equal(ok({ ...base, expectedUpdatedAt: "2026-09-19T01:00:00.000Z" }).expectedUpdatedAt, "2026-09-19T01:00:00.000Z");
});

test("chuyển trạng thái một chiều", () => {
  assert.ok(canTransition("draft", "confirmed"));
  assert.ok(canTransition("draft", "cancelled"));
  assert.ok(canTransition("confirmed", "cancelled"));
  assert.ok(!canTransition("confirmed", "draft"));
  assert.ok(!canTransition("cancelled", "draft"));
  assert.ok(!canTransition("cancelled", "confirmed"));
  assert.ok(!canTransition("draft", "draft"));
});

test("mã đơn theo ngày giờ Việt Nam", () => {
  // 2026-09-16 18:30 UTC = 01:30 ngày 17 giờ VN
  assert.equal(orderCodePrefix(new Date("2026-09-16T18:30:00Z")), "TD-20260917-");
  assert.equal(orderCodePrefix(new Date("2026-09-16T16:59:00Z")), "TD-20260916-");
});

test("chỉ người lập đơn hoặc admin được sửa/đổi trạng thái", () => {
  const order = { staffId: "a" };
  assert.ok(canModify({ id: "a", role: "sales" }, order));
  assert.ok(canModify({ id: "z", role: "admin" }, order));
  assert.ok(!canModify({ id: "b", role: "sales" }, order));
});
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/modules/orders/rules.test.ts
```

Expected: FAIL — hầu hết test đỏ (`# pass 3`, `# fail 11`): `validateOrder` cũ chưa biết `services`.

- [ ] **Bước 3: Cài đặt** — thay toàn bộ `src/modules/orders/rules.ts`

```ts
// Luật nghiệp vụ thuần của đơn hàng (spec §2.3): kiểm tra đầu vào, tính tiền, chuyển trạng thái, mã đơn.
// Luật của TỪNG DỊCH VỤ (số khách, thông tin chuyến, dòng tiền sinh từ danh mục) nằm ở ./service-rules.ts.
// Chỉ import file thuần của shared, không chạm I/O để kiểm thử độc lập bằng `npm test`.
import type { DepositMethod, OrderStatus } from "../../shared/contracts.ts";
import { MAX_AMOUNT_VND as MAX_AMOUNT } from "../../shared/order-lines.ts";
import { vnToday } from "../../shared/vn-date.ts";
import { int, text } from "./fields.ts";
import { MAX_LINES_PER_ORDER, MAX_SERVICES, validateService, type ServiceContext, type ServiceFailure, type ValidItem, type ValidService } from "./service-rules.ts";

export type { DepositMethod, OrderStatus, ServiceContext, ValidItem, ValidService };

export const DEPOSIT_METHODS: readonly DepositMethod[] = ["cash", "bank_transfer", "other"];

/** Đơn đã kiểm tra: mọi số tiền dẫn xuất đều do server tính, không lấy từ client. */
export interface ValidOrder {
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  customerNote: string | null;
  services: ValidService[];
  /** Mọi dòng tiền của mọi dịch vụ (theo thứ tự dịch vụ rồi dòng). */
  items: ValidItem[];
  subtotal: number;
  discount: number;
  total: number;
  depositAmount: number;
  depositMethod: DepositMethod | null;
  remainingAmount: number;
  paymentNote: string | null;
  /** Chỉ dùng cho PUT: `updated_at` mà client đã đọc (khoá lạc quan). */
  expectedUpdatedAt: string | null;
}

export type Failure = { ok: false; message: string; code?: ServiceFailure["code"] | "client_outdated"; details?: unknown };
export type Validated = { ok: true; value: ValidOrder } | Failure;

const fail = (message: string): Failure => ({ ok: false, message });

const PHONE_RE = /^\+?[0-9][0-9 .\-]{6,18}[0-9]$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateOrder(input: unknown, ctx: ServiceContext): Validated {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đơn không hợp lệ.");
  const b = input as Record<string, unknown>;
  // Tab mở từ trước khi triển khai vẫn gửi `items` phẳng kiểu cũ.
  if (b.services === undefined && Array.isArray(b.items)) return { ok: false, code: "client_outdated", message: "Trang đã cũ, hãy tải lại trang rồi thử lại." };

  const name = text(b.customerName, "Tên khách hàng", 200, true);
  if (name.error) return fail(name.error);
  const phone = text(b.customerPhone, "Số điện thoại khách", 30, true);
  if (phone.error) return fail(phone.error);
  const phoneValue = phone.value!.replace(/\s+/g, " ");
  if (!PHONE_RE.test(phoneValue)) return fail("Số điện thoại khách không hợp lệ.");
  const email = text(b.customerEmail, "Email khách", 200, false);
  if (email.error) return fail(email.error);
  if (email.value && !EMAIL_RE.test(email.value)) return fail("Email khách không hợp lệ.");
  const note = text(b.customerNote, "Ghi chú khách", 2000, false);
  if (note.error) return fail(note.error);
  const paymentNote = text(b.paymentNote, "Ghi chú thanh toán", 1000, false);
  if (paymentNote.error) return fail(paymentNote.error);

  if (!Array.isArray(b.services) || b.services.length === 0) return fail("Đơn cần ít nhất một dịch vụ.");
  if (b.services.length > MAX_SERVICES) return fail(`Đơn tối đa ${MAX_SERVICES} dịch vụ.`);

  const services: ValidService[] = [];
  const usedIds = new Set<string>();
  for (const [i, raw] of b.services.entries()) {
    const r = validateService(raw, i, ctx);
    if (!r.ok) return r;
    if (r.value.id !== null) {
      if (usedIds.has(r.value.id)) return fail(`Dịch vụ ${i + 1}: trùng một dịch vụ đã lưu.`);
      usedIds.add(r.value.id);
    }
    services.push(r.value);
  }
  const items = services.flatMap((s) => s.items);
  if (items.length > MAX_LINES_PER_ORDER) return fail(`Đơn tối đa ${MAX_LINES_PER_ORDER} dòng tiền.`);
  let subtotal = 0;
  for (const it of items) {
    subtotal += it.lineTotal;
    if (subtotal > MAX_AMOUNT) return fail("Tổng tiền vượt giới hạn.");
  }

  const discount = int(b.discount, "Giảm giá", 0, MAX_AMOUNT, 0);
  if (discount.error) return fail(discount.error);
  if (discount.value > subtotal) return fail("Giảm giá không được vượt quá tạm tính.");
  const total = subtotal - discount.value;

  const deposit = int(b.depositAmount, "Tiền cọc", 0, MAX_AMOUNT, 0);
  if (deposit.error) return fail(deposit.error);
  if (deposit.value > total) return fail("Tiền cọc không được vượt quá tổng cộng.");

  let depositMethod: DepositMethod | null = null;
  if (deposit.value > 0) {
    if (!DEPOSIT_METHODS.includes(b.depositMethod as DepositMethod)) return fail("Cần chọn hình thức cọc (tiền mặt, chuyển khoản hoặc khác).");
    depositMethod = b.depositMethod as DepositMethod;
  }

  return {
    ok: true,
    value: {
      customerName: name.value!,
      customerPhone: phoneValue,
      customerEmail: email.value,
      customerNote: note.value,
      services,
      items,
      subtotal,
      discount: discount.value,
      total,
      depositAmount: deposit.value,
      depositMethod,
      remainingAmount: total - deposit.value,
      paymentNote: paymentNote.value,
      expectedUpdatedAt: typeof b.expectedUpdatedAt === "string" && b.expectedUpdatedAt ? b.expectedUpdatedAt : null,
    },
  };
}

/** Ai được sửa/xác nhận/huỷ đơn: người lập đơn hoặc admin. Xem đơn thì mọi nhân viên đều được (§2.4-4). */
export function canModify(staff: { id: string; role: "sales" | "admin" }, order: { staffId: string }): boolean {
  return staff.role === "admin" || staff.id === order.staffId;
}

// draft → confirmed → cancelled, hoặc draft → cancelled. Không có đường quay lại (§2.3).
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  draft: ["confirmed", "cancelled"],
  confirmed: ["cancelled"],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isOrderStatus(v: unknown): v is OrderStatus {
  return v === "draft" || v === "confirmed" || v === "cancelled";
}

/** Tiền tố mã đơn `TD-YYYYMMDD-`; số thứ tự NNNN do repository sinh trong câu INSERT. Ngày tính theo giờ Việt Nam (UTC+7) để đơn cuối ngày không nhảy sang ngày UTC khác. */
export function orderCodePrefix(now: Date): string {
  return `TD-${vnToday(now).replaceAll("-", "")}-`;
}
```

Sửa shim trong `src/modules/orders/index.ts` (hai chỗ gọi `validateOrder`):

```diff
--- a/src/modules/orders/index.ts
+++ b/src/modules/orders/index.ts
@@ -27,7 +27,7 @@
     }),
 
     route("POST", "/api/orders", "staff", async ({ env, request, staff }) => {
-      const parsed = validateOrder(await readJson(request));
+      const parsed = validateOrder(await readJson(request), { catalog: new Map(), stored: [] });
       if (!parsed.ok) return error(400, "invalid_input", parsed.message);
       const id = await createOrder(env.DB, staff.id, parsed.value);
       return json({ order: (await findOrder(env.DB, id))! } satisfies OrderResponse, 201);
@@ -47,7 +47,7 @@
       if (!meta) return NOT_FOUND();
       if (!canModify(staff, meta)) return FORBIDDEN();
       if (meta.status !== "draft") return error(409, "not_editable", "Chỉ sửa được đơn ở trạng thái nháp. Muốn đổi đơn đã xác nhận, hãy huỷ và tạo đơn mới.");
-      const parsed = validateOrder(await readJson(request));
+      const parsed = validateOrder(await readJson(request), { catalog: new Map(), stored: [] });
       if (!parsed.ok) return error(400, "invalid_input", parsed.message);
       if (!(await updateDraftOrder(env.DB, id, staff.id, parsed.value))) {
         return error(409, "not_editable", "Đơn vừa được đổi trạng thái, không sửa được nữa.");
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
npm test && npx tsc --noEmit && npx tsc --noEmit -p web
```

Expected: `rules.test.ts` 14/14; `# tests 88`, `# pass 88`; hai `tsc` không lỗi.

- [ ] **Bước 5: Commit**

```bash
git add src/modules/orders/rules.ts src/modules/orders/rules.test.ts src/modules/orders/index.ts
git commit -m "orders/rules: validateOrder nhận danh sách dịch vụ và ngữ cảnh danh mục (index.ts còn shim tạm)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 7: e2e viết trước (ĐỎ) — dữ liệu chuyến, xác nhận, đua, khoá lạc quan, bản chụp, sửa sau xác nhận

**Files:**
- Modify: `tests/e2e/lib.mjs`, `tests/e2e/orders.mjs` (thay toàn bộ), `tests/e2e/platform.mjs`, `tests/e2e/run.mjs`
- Create: `tests/e2e/trip.mjs`

**Interfaces:**
- Consumes: hợp đồng HTTP của spec §4 (mô tả trong các bước dưới; cài đặt ở Task 8).
- Produces: `lib.mjs` xuất thêm `sqlRows(q)` (SELECT qua `wrangler --json`), `vnDate(days)`, `manualService(items, extra)`, `orderInput(extra)`. Kịch bản `trip` dùng danh mục **giả** `ZT1/ZT2/ZT3` chèn thẳng vào D1 (không cần Google Sheet) và dọn ở `finally`.

`trip.mjs` phủ: dòng tiền do máy chủ sinh (bỏ qua số lượng giả), lệch giá + nhật ký, `catalog_changed`, lỗi đầu vào, `client_outdated`, chuẩn hoá chuyến, xác nhận đòi đủ chuyến (thiếu ngày / quá khứ / quá xa / 0 khách, biên `hôm nay` và `+365`), **đua "lưu xoá ngày" với "xác nhận"**, khoá lạc quan (`stale`, thiếu mốc, hai PUT cùng mốc — nội dung hai bên khác nhau để bắt bên thua ghi đè), bản chụp dịch vụ đã ẩn/đổi giá, sửa trường vận hành sau xác nhận (nhật ký không chứa địa điểm, trigger khoá số khách/dịch vụ/ngày), và bất biến SQL (Σ số lượng = số khách, đơn xác nhận đủ chuyến, không dòng tiền mồ côi).

- [ ] **Bước 1: Viết các file e2e**

Sửa `tests/e2e/lib.mjs` (thêm tiện ích):

```diff
--- a/tests/e2e/lib.mjs
+++ b/tests/e2e/lib.mjs
@@ -56,4 +56,32 @@
   }
 }
 
+/** Như sql() nhưng trả các dòng kết quả của câu SELECT (wrangler --json). */
+export async function sqlRows(q) {
+  const args = ["wrangler", "d1", "execute", "tourdao-sales-db", "--local", "--json", "--command", q];
+  if (PERSIST) args.push("--persist-to", PERSIST);
+  try {
+    const out = (await execFileAsync("npx", args, { encoding: "utf8" })).stdout;
+    return JSON.parse(out)[0].results;
+  } catch (e) {
+    throw new Error(`${e.stderr ?? ""}${e.stdout ?? ""}`);
+  }
+}
+
 export const randomPhone = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
+
+/** Ngày (YYYY-MM-DD) theo giờ Việt Nam, cách hôm nay `days` ngày — cùng quy ước với src/shared/vn-date.ts. */
+export function vnDate(days = 0) {
+  return new Date(Date.now() + 7 * 3600_000 + days * 86400_000).toISOString().slice(0, 10);
+}
+
+/** Dịch vụ nhập tay tối thiểu (đủ ngày khởi hành + 1 khách để xác nhận được). `extra` ghi đè/bổ sung trường. */
+export const manualService = (items, extra = {}) => ({ kind: "manual", name: "Dịch vụ thử", pax: { adult: 1 }, departDate: vnDate(7), items, ...extra });
+
+/** Đơn hợp lệ tối thiểu; `extra` ghi đè trường cấp đơn (vd `services`, `discount`). */
+export const orderInput = (extra = {}) => ({
+  customerName: "Nguyễn Văn A",
+  customerPhone: "0901 234 567",
+  services: [manualService([{ description: "Tour", quantity: 1, unitPrice: 100000 }])],
+  ...extra,
+});
```

Thay toàn bộ `tests/e2e/orders.mjs` (giữ nguyên mọi kiểm tra cũ về tiền, phân quyền, đua, nhật ký, trigger; chỉ đổi hình dạng đầu vào sang `services`, thêm `expectedUpdatedAt` cho `PUT`):

```js
import assert from "node:assert/strict";
import { ACCOUNTS, call, manualService, session, sql } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA);
const Bc = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);

// chưa đăng nhập
assert.equal((await call(null, "GET", "/api/orders")).status, 401);

// Dịch vụ nhập tay (có ngày khởi hành + 3 khách) — tiền tự do; dịch vụ từ danh mục và thông tin chuyến kiểm kỹ ở trip.mjs.
const svc = (items, extra = {}) => manualService(items, { pax: { adult: 3 }, ...extra });
const lines = (order) => order.services.flatMap((s) => s.items);
const input = {
  customerName: "Nguyễn Văn A", customerPhone: "0901 234 567", customerEmail: "a@example.com",
  services: [svc([{ description: "Tour Hòn Mun", detail: "20/09, 3 khách", quantity: 3, unitPrice: 450000 }, { description: "Áo phao", quantity: 1, unitPrice: 50000 }])],
  discount: 100000, depositAmount: 500000, depositMethod: "cash",
  // client cố gian lận số dẫn xuất:
  total: 1, subtotal: 1, remainingAmount: 0,
};
let r = await call(A, "POST", "/api/orders", input);
assert.equal(r.status, 201, JSON.stringify(r.body));
const o = r.body.order;
console.log("tạo:", o.orderCode, o.subtotal, o.total, o.remainingAmount, o.status);
assert.match(o.orderCode, /^TD-\d{8}-\d{4}$/);
assert.equal(o.subtotal, 1400000); assert.equal(o.total, 1300000); assert.equal(o.remainingAmount, 800000);
assert.deepEqual(lines(o).map((i) => i.lineTotal), [1350000, 50000]);

// nhân viên B xem được đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.status, 200); assert.equal(r.body.order.staffName, "NV Bán A (test)");
assert.equal(r.body.history.length, 1);
r = await call(Bc, "GET", "/api/orders?q=Hòn"); // tìm theo tên khách không khớp dịch vụ → 0
r = await call(Bc, "GET", "/api/orders?q=" + encodeURIComponent("Nguyễn"));
assert.ok(r.body.orders.some((x) => x.id === o.id));
r = await call(Bc, "GET", "/api/orders?q=" + o.orderCode);
assert.equal(r.body.orders.length, 1);
r = await call(Bc, "GET", "/api/orders?q=%25"); // ký tự LIKE được escape
assert.equal(r.body.orders.length, 0);

// bất biến: giảm giá / cọc quá mức, số âm, chuỗi
for (const bad of [{ discount: 1400001 }, { depositAmount: 1300001 }, { discount: -1 }, { services: [svc([{ description: "x", quantity: 1, unitPrice: "5" }])] }, { services: [] }]) {
  r = await call(A, "POST", "/api/orders", { ...input, ...bad });
  assert.equal(r.status, 400, JSON.stringify(bad));
}

// PHÂN QUYỀN: B (sales, không phải người lập) xem được nhưng KHÔNG sửa/đổi trạng thái đơn của A
r = await call(Bc, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, false);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.canModify, true);
assert.equal((await call(Bc, "PUT", `/api/orders/${o.id}`, input)).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 403);
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 403);
assert.equal((await call(null, "PUT", `/api/orders/${o.id}`, input)).status, 401);
r = await call(A, "GET", `/api/orders/${o.id}`);
assert.equal(r.body.order.status, "draft"); assert.equal(r.body.history.length, 1); // bị từ chối → không đổi gì, không ghi log

// người lập đơn sửa draft (PUT cần expectedUpdatedAt = mốc đã đọc)
const replace = { services: [svc([{ description: "Tour Bãi Tranh", quantity: 2, unitPrice: 300000 }], { pax: { adult: 2 } })], discount: 0, depositAmount: 0 };
r = await call(A, "PUT", `/api/orders/${o.id}`, { ...input, ...replace, expectedUpdatedAt: o.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.total, 600000); assert.equal(r.body.order.remainingAmount, 600000); assert.equal(lines(r.body.order).length, 1);
assert.equal(r.body.order.depositMethod, null);
let cur = r.body.order;

// admin (không phải người lập) sửa được
r = await call(ADMIN, "PUT", `/api/orders/${o.id}`, { ...input, ...replace, customerNote: "admin sửa", expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200);

// xác nhận (người lập): đơn có ngày khởi hành + khách nên đủ điều kiện
r = await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.equal(r.body.order.status, "confirmed"); assert.ok(r.body.order.confirmedAt);
// không sửa được, không quay về draft, không xác nhận lại
assert.equal((await call(A, "PUT", `/api/orders/${o.id}`, input)).status, 409);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "draft" })).status, 400);
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "confirmed" })).status, 409);
// B vẫn không huỷ được; admin huỷ được
assert.equal((await call(Bc, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 403);
r = await call(ADMIN, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" });
assert.equal(r.body.order.status, "cancelled");
assert.equal((await call(A, "POST", `/api/orders/${o.id}/status`, { status: "cancelled" })).status, 409);
r = await call(A, "GET", `/api/orders/${o.id}`);
console.log("lịch sử:", r.body.history.map((h) => `${h.action}/${h.staffName}`).join(", "));
assert.deepEqual(r.body.history.map((h) => h.action), ["created", "updated", "updated", "confirmed", "cancelled"]);
assert.equal(r.body.history.at(-1).staffName, "QTV Test");

// NHẬT KÝ TOÀN HỆ THỐNG: chỉ admin
assert.equal((await call(A, "GET", "/api/audit")).status, 403);
assert.equal((await call(Bc, "GET", "/api/audit")).status, 403);
assert.equal((await call(null, "GET", "/api/audit")).status, 401);
r = await call(ADMIN, "GET", "/api/audit?limit=100");
assert.equal(r.status, 200);
assert.ok(r.body.entries.length >= 5);
assert.ok(r.body.entries.some((e) => e.targetLabel === o.orderCode && e.action === "cancelled" && e.staffName === "QTV Test"));
r = await call(ADMIN, "GET", "/api/audit?action=cancelled&q=" + o.orderCode);
assert.equal(r.body.entries.length, 1);
r = await call(ADMIN, "GET", "/api/audit?action=hack");
assert.equal(r.status, 400);
r = await call(ADMIN, "GET", "/api/audit?q=%25");
assert.equal(r.body.entries.length, 0);
r = await call(ADMIN, "GET", "/api/audit?limit=2");
assert.equal(r.body.entries.length, 2); assert.equal(r.body.hasMore, true);

// 404 / id rác
assert.equal((await call(A, "GET", "/api/orders/00000000-0000-0000-0000-000000000000")).status, 404);
assert.equal((await call(A, "GET", "/api/orders/abc")).status, 404);

// đồng thời: 30 đơn cùng lúc → mã duy nhất
const many = await Promise.all(Array.from({ length: 30 }, (_, i) => call(i % 2 ? A : Bc, "POST", "/api/orders", { ...input, customerName: `Song song ${i}` })));
assert.ok(many.every((m) => m.status === 201), JSON.stringify(many.filter((m) => m.status !== 201)));
const codes = many.map((m) => m.body.order.orderCode);
assert.equal(new Set(codes).size, 30);
console.log("song song:", codes.sort().join(" "));

// phân trang
r = await call(A, "GET", "/api/orders?limit=3");
assert.equal(r.body.orders.length, 3); assert.equal(r.body.hasMore, true);

// DỊCH VỤ NHẬP TAY: dòng tiền không mang mã dịch vụ / loại khách / giá danh mục; mã dịch vụ sai dạng bị từ chối
// (dịch vụ chọn từ danh mục, lưu catalog_price + pax_code: xem trip.mjs)
r = await call(A, "POST", "/api/orders", { ...input, services: [svc([{ description: "Tour 3 đảo — Người lớn", quantity: 2, unitPrice: 850000 }, { description: "Nhập tay", quantity: 1, unitPrice: 1 }])], discount: 0, depositAmount: 0 });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(lines(r.body.order).map((i) => [i.catalogCode, i.paxCode, i.catalogPrice]), [[null, null, null], [null, null, null]]);
assert.equal(r.body.order.services[0].kind, "manual");
const traced = r.body.order;
assert.equal((await call(A, "POST", "/api/orders", { ...input, services: [{ kind: "catalog", catalogCode: "x y", pax: { adult: 1 }, catalogPriceSeen: {} }] })).status, 400);
console.log("✓ dịch vụ nhập tay lưu và đọc lại");

// BẤT BIẾN TIỀN TRONG SQL (0007): ghi thẳng số sai vào D1 bị TRIGGER chặn; sửa đúng luật qua API vẫn chạy
for (const bad of [
  `UPDATE orders SET total = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE orders SET remaining_amount = -1, deposit_amount = total + 1 WHERE id = '${traced.id}'`,
  `UPDATE order_item SET line_total = line_total + 1 WHERE order_id = '${traced.id}'`,
  `UPDATE orders SET deposit_amount = 1, remaining_amount = total - 1, deposit_method = NULL WHERE id = '${traced.id}'`,
]) await assert.rejects(sql(bad), /money_invariant/, `TRIGGER phải chặn: ${bad}`);
await sql(`UPDATE orders SET customer_note = 'sửa hợp lệ' WHERE id = '${traced.id}'`); // cập nhật không đụng tiền vẫn qua
r = await call(A, "GET", `/api/orders/${traced.id}`);
assert.equal(r.body.order.total, 1700001); assert.deepEqual(lines(r.body.order).map((i) => i.lineTotal), [1700000, 1]);
r = await call(A, "PUT", `/api/orders/${traced.id}`, { ...input, discount: 1000, depositAmount: 200000, expectedUpdatedAt: r.body.order.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ TRIGGER chặn số tiền sai ghi thẳng vào D1, API vẫn sửa được");

// TRANH CHẤP: thao tác thua cuộc (điều kiện SQL không còn đúng) KHÔNG được để lại dòng nhật ký (idiom changes() > 0)
for (let round = 0; round < 3; round++) {
  const d = (await call(A, "POST", "/api/orders", { ...input, customerName: `Tranh chấp ${round}` })).body.order;
  const [c1, c2] = await Promise.all([
    call(A, "POST", `/api/orders/${d.id}/status`, { status: "confirmed" }),
    call(ADMIN, "POST", `/api/orders/${d.id}/status`, { status: "cancelled" }),
  ]);
  const wins = [c1, c2].filter((x) => x.status === 200).length;
  const hist = (await call(A, "GET", `/api/orders/${d.id}`)).body.history.map((h) => h.action);
  // Nếu hai request chạy nối tiếp thì cả hai có thể thắng (draft→confirmed→cancelled); nếu đan xen thì kẻ thua nhận 409.
  // Dù thế nào, số dòng nhật ký phải đúng bằng số thao tác thắng. (Đơn có đủ chuyến nên xác nhận không thua vì thiếu ngày — bài đua này kiểm tranh chấp trạng thái.)
  assert.ok(wins >= 1);
  assert.equal(hist.length, 1 + wins, `nhật ký phải khớp số thao tác thắng: ${hist} / ${c1.status},${c2.status}`);
}
console.log("✓ thao tác thua khi tranh chấp không ghi nhật ký");
console.log("E2E OK");
```

Sửa `tests/e2e/platform.mjs`:

```diff
--- a/tests/e2e/platform.mjs
+++ b/tests/e2e/platform.mjs
@@ -1,6 +1,6 @@
 // Hành vi chung của router (src/shared/router.ts): 404/405 JSON, chặn ghi cross-site (CSRF), chỉ nhận JSON.
 import assert from "node:assert/strict";
-import { ACCOUNTS, BASE, call, freshIp, session } from "./lib.mjs";
+import { ACCOUNTS, BASE, call, freshIp, manualService, orderInput, session } from "./lib.mjs";
 
 const SALES = await session(ACCOUNTS.salesA);
 const ADMIN = await session(ACCOUNTS.admin);
@@ -20,7 +20,7 @@
 console.log("✓ 404/405/401/403 thống nhất");
 
 // CSRF: ghi mà không có Origin (và không có Sec-Fetch-Site same-origin) hoặc Origin lạ → 403, không có tác dụng
-const input = { customerName: "CSRF", customerPhone: "0901234567", items: [{ description: "x", quantity: 1, unitPrice: 1 }] };
+const input = orderInput({ customerName: "CSRF", customerPhone: "0901234567", services: [manualService([{ description: "x", quantity: 1, unitPrice: 1 }])] });
 const before = (await call(SALES, "GET", "/api/orders?q=CSRF")).body.orders.length;
 r = await raw("POST", "/api/orders", { cookie: SALES, "content-type": "application/json" }, JSON.stringify(input));
 assert.equal(r.status, 403); assert.equal(r.body.error.code, "cross_origin");
```

Sửa `tests/e2e/run.mjs` (đăng ký kịch bản mới, chạy sau `orders`):

```diff
--- a/tests/e2e/run.mjs
+++ b/tests/e2e/run.mjs
@@ -14,7 +14,7 @@
 
 const HERE = dirname(fileURLToPath(import.meta.url));
 const ROOT = join(HERE, "..", "..");
-const ALL = ["platform", "orders", "admin", "catalog", "admin-race"];
+const ALL = ["platform", "orders", "trip", "admin", "catalog", "admin-race"];
 const picked = process.argv.slice(2);
 const scripts = picked.length ? picked : ALL;
 for (const s of scripts) if (!ALL.includes(s)) throw new Error(`Không có kịch bản "${s}" (có: ${ALL.join(", ")})`);
```

Tạo `tests/e2e/trip.mjs`:

```js
// Thông tin chuyến đi theo từng dịch vụ (docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md): dòng tiền do MÁY CHỦ sinh,
// lệch giá danh mục, xác nhận đòi đủ chuyến, đua tranh chấp, khoá lạc quan, bản chụp cho nháp cũ, sửa trường vận hành sau xác nhận.
// Dùng danh mục GIẢ (mã ZT*) chèn thẳng vào D1 — không phụ thuộc Google Sheet; dọn ở `finally`.
import assert from "node:assert/strict";
import { ACCOUNTS, call, manualService, orderInput, session, sql, sqlRows, vnDate } from "./lib.mjs";

const A = await session(ACCOUNTS.salesA);
const Bc = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);

const T = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZT1','Tour thử','perPax',850000,595000,850000,0,'Trẻ em cao từ 1 m đến 1,4 mét',NULL,NULL,2,1,${T},${T}),
  ('ZT2','Phao thử','per5Pax',1000000,NULL,NULL,NULL,NULL,NULL,NULL,3,1,${T},${T}),
  ('ZT3','Motor thử','perPax',800000,NULL,NULL,NULL,NULL,NULL,NULL,4,1,${T},${T})`);

const cat = (extra = {}) => ({ kind: "catalog", catalogCode: "ZT1", pax: { adult: 2, child: 1 }, catalogPriceSeen: { adult: 850000, child: 595000 }, departDate: vnDate(7), ...extra });
const tourLine = [{ description: "Tour", quantity: 1, unitPrice: 100000 }];
const lines = (order) => order.services.flatMap((s) => s.items);
const post = (services, extra = {}) => call(A, "POST", "/api/orders", orderInput({ services, ...extra }));
const put = (order, services, extra = {}) => call(A, "PUT", `/api/orders/${order.id}`, orderInput({ services, expectedUpdatedAt: order.updatedAt, ...extra }));
const confirm = (who, order) => call(who, "POST", `/api/orders/${order.id}/status`, { status: "confirmed" });
const get = async (who, order) => (await call(who, "GET", `/api/orders/${order.id}`)).body;
const tripOf = (sv) => ({
  departDate: sv.departDate ?? "", departTime: sv.departTime ?? "", pickupTime: sv.pickupTime ?? "", pickupPlace: sv.pickupPlace ?? "",
  checkinDate: sv.checkinDate ?? "", checkinTime: sv.checkinTime ?? "", checkinPlace: sv.checkinPlace ?? "", note: sv.note ?? "",
});
/** PUT /trip gửi ĐỦ thông tin chuyến của dịch vụ đầu (trường vắng = xoá), rồi ghi đè `changes`. */
const trip = (o, changes, who = A, expected = o.updatedAt) =>
  call(who, "PUT", `/api/orders/${o.id}/trip`, { expectedUpdatedAt: expected, services: [{ id: o.services[0].id, ...tripOf(o.services[0]), ...changes }] });

let r;
try {
  // 1) MÁY CHỦ SINH DÒNG TIỀN: không nhận số lượng từ client; lưu catalog_price, loại khách, số khách
  r = await post([cat({ items: [{ description: "hack", quantity: 99, unitPrice: 1 }] }), cat({ catalogCode: "ZT2", pax: { adult: 7 }, catalogPriceSeen: { adult: 1000000 } })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const o1 = r.body.order;
  assert.deepEqual(lines(o1).map((i) => [i.catalogCode, i.paxCode, i.quantity, i.unitPrice, i.catalogPrice, i.lineTotal]), [
    ["ZT1", "adult", 2, 850000, 850000, 1700000],
    ["ZT1", "child", 1, 595000, 595000, 595000],
    ["ZT2", "adult", 2, 1000000, 1000000, 2000000], // 7 khách / nhóm 5 = 2 lượt
  ]);
  assert.equal(o1.subtotal, 4295000);
  assert.deepEqual(o1.services.map((s) => [s.kind, s.unit, s.pax.adult, s.pax.child, s.catalogStatus]), [["catalog", "perPax", 2, 1, "ok"], ["catalog", "per5Pax", 7, 0, "ok"]]);
  assert.equal(lines(o1)[1].detail, "Trẻ em cao từ 1 m đến 1,4 mét");
  console.log("✓ máy chủ sinh dòng tiền từ danh mục, bỏ qua số lượng giả");

  // 2) ĐƠN GIÁ THƯƠNG LƯỢNG: lưu unitPrice khác catalogPrice, nhật ký ghi lệch giá (không chặn)
  r = await post([cat({ unitPrices: { adult: 800000 } })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual(lines(r.body.order).map((i) => [i.unitPrice, i.catalogPrice]), [[800000, 850000], [595000, 595000]]);
  assert.match((await get(A, r.body.order)).history[0].detail, /lệch giá danh mục: ZT1 người lớn 850\.000 ₫ → 800\.000 ₫/);
  console.log("✓ đơn giá thương lượng: lưu lệch giá + ghi nhật ký, không chặn");

  // 3) GIÁ DANH MỤC VỪA ĐỔI giữa lúc mở form và lúc lưu → 409 catalog_changed, không lưu gì
  const newest = async () => (await call(A, "GET", "/api/orders?limit=1")).body.orders[0].id;
  const before = await newest();
  r = await post([cat({ catalogPriceSeen: { adult: 900000, child: 595000 } })]);
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "catalog_changed");
  assert.deepEqual(r.body.error.changes, [{ serviceIndex: 0, catalogCode: "ZT1", pax: "adult", seen: 900000, current: 850000 }]);
  assert.equal(await newest(), before, "không lưu đơn nào");
  console.log("✓ giá danh mục đổi giữa chừng → 409 catalog_changed");

  // 4) LỖI ĐẦU VÀO
  r = await post([cat({ catalogCode: "NOPE" })]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  const rejected = [
    [cat({ catalogCode: "ZT3", pax: { adult: 1, child: 1 }, catalogPriceSeen: { adult: 800000 } }), /không có giá cho trẻ em/],
    [cat({ pax: { adult: 51 }, catalogPriceSeen: { adult: 850000 } }), /số khách người lớn/],
    [cat({ pax: { adult: 30, child: 21 } }), /tối đa 50 khách/],
    [cat({ pax: { infant: 2 }, catalogPriceSeen: { infant: 0 } }), /không phải em bé/],
    [cat({ departDate: "2026-02-30" }), /ngày khởi hành/],
    [cat({ departTime: "24:00" }), /giờ khởi hành/],
    [cat({ pickupPlace: "x".repeat(201) }), /tối đa 200/],
    [cat({ unitPrices: { adult: 1.5 } }), /số nguyên/],
    [{ ...cat(), kind: "khac" }, /loại dịch vụ/],
  ];
  for (const [svc, re] of rejected) {
    r = await post([svc]);
    assert.equal(r.status, 400, JSON.stringify(svc));
    assert.match(r.body.error.message, re);
  }
  console.log("✓ đầu vào sai bị từ chối đúng lý do");

  // 5) TAB CŨ gửi `items` phẳng kiểu cũ → 409 client_outdated
  r = await call(A, "POST", "/api/orders", { customerName: "A", customerPhone: "0901234567", items: [{ description: "x", quantity: 1, unitPrice: 1 }] });
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "client_outdated");

  // 6) THÔNG TIN CHUYẾN lưu và đọc lại đúng, đã chuẩn hoá
  r = await post([cat({ departTime: "07:30", pickupTime: "06:45", pickupPlace: "KS A\n50 Trần Phú", checkinDate: vnDate(7), checkinTime: "07:00", checkinPlace: "Cảng Cầu Đá", note: "ăn chay\nsay sóng" })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const s = r.body.order.services[0];
  assert.deepEqual([s.departTime, s.pickupTime, s.pickupPlace, s.checkinDate, s.checkinTime, s.checkinPlace, s.note], ["07:30", "06:45", "KS A 50 Trần Phú", vnDate(7), "07:00", "Cảng Cầu Đá", "ăn chay\nsay sóng"]);
  console.log("✓ thông tin chuyến lưu và chuẩn hoá");

  // 7) XÁC NHẬN ĐÒI ĐỦ CHUYẾN (Q4): nháp thiếu ngày lưu được, xác nhận 409, bổ sung rồi mới xác nhận được
  r = await post([cat({ departDate: "" }), manualService([{ description: "Áo phao", quantity: 1, unitPrice: 50000 }], { departDate: vnDate(8) })]);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const d1 = r.body.order;
  r = await confirm(A, d1);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "incomplete_trip");
  assert.deepEqual(r.body.error.missing, [{ serviceId: d1.services[0].id, name: "Tour thử", reasons: ["no_date"] }]);
  let g = await get(A, d1);
  assert.equal(g.order.status, "draft");
  assert.deepEqual(g.history.map((h) => h.action), ["created"], "xác nhận thất bại không ghi nhật ký");
  r = await put(d1, [cat({ id: d1.services[0].id, departDate: vnDate(9) }), manualService([{ description: "Áo phao", quantity: 1, unitPrice: 50000 }], { id: d1.services[1].id, departDate: vnDate(8) })]);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.order.services.map((x) => x.id), d1.services.map((x) => x.id), "id dịch vụ ổn định qua lần sửa");
  r = await confirm(A, r.body.order);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.order.status, "confirmed");
  assert.deepEqual((await get(A, d1)).history.map((h) => h.action), ["created", "updated", "confirmed"]);
  console.log("✓ xác nhận đòi đủ ngày khởi hành; nhật ký khớp");

  // 8) QUÁ KHỨ / QUÁ XA / 0 KHÁCH (Q12): nháp lưu được, xác nhận bị chặn; hai đầu khoảng [hôm nay, +365] thì được
  const dated = async (departDate, pax = { adult: 1 }) => {
    const x = await post([manualService([{ description: "x", quantity: 1, unitPrice: 1 }], { departDate, pax })]);
    assert.equal(x.status, 201, JSON.stringify(x.body));
    return x.body.order;
  };
  const gap = async (order) => {
    const x = await confirm(A, order);
    assert.equal(x.status, 409, JSON.stringify(x.body));
    assert.equal(x.body.error.code, "incomplete_trip");
    return x.body.error.missing[0].reasons;
  };
  assert.deepEqual(await gap(await dated(vnDate(-1))), ["past_date"]);
  assert.deepEqual(await gap(await dated(vnDate(366))), ["too_far"]);
  assert.deepEqual(await gap(await dated(vnDate(7), { adult: 0 })), ["no_guests"]);
  for (const day of [vnDate(0), vnDate(365)]) {
    const x = await confirm(A, await dated(day));
    assert.equal(x.status, 200, `${day}: ${JSON.stringify(x.body)}`);
  }
  console.log("✓ xác nhận chặn quá khứ / quá xa / 0 khách; biên hôm nay và +365 được");

  // 9) ĐUA "lưu xoá ngày" với "xác nhận": không bao giờ ra đơn xác nhận thiếu ngày (điều kiện nằm trong câu UPDATE)
  for (let round = 0; round < 5; round++) {
    const d = (await post([manualService(tourLine)])).body.order;
    const clear = put(d, [manualService(tourLine, { id: d.services[0].id, departDate: "" })]);
    const [p, c] = await Promise.all([clear, confirm(ADMIN, d)]);
    const now = (await get(A, d)).order;
    if (now.status === "confirmed") assert.ok(now.services.every((sv) => sv.departDate), `đơn xác nhận thiếu ngày (PUT ${p.status}, xác nhận ${c.status})`);
    else assert.equal(now.status, "draft");
  }
  console.log("✓ đua lưu-xoá-ngày với xác nhận: không có đơn xác nhận thiếu ngày");

  // 10) KHOÁ LẠC QUAN: mốc cũ → 409 stale; thiếu mốc → 400; hai PUT cùng mốc → đúng một bên thắng, bên thua không để lại gì
  const s0 = (await post([manualService(tourLine)])).body.order;
  const same = (order) => [manualService(tourLine, { id: order.services[0].id })];
  r = await put(s0, same(s0), { customerNote: "v1" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await put(s0, same(s0), { customerNote: "v2" }); // mốc đã cũ
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
  r = await call(A, "PUT", `/api/orders/${s0.id}`, orderInput());
  assert.equal(r.status, 400);
  const cur = (await get(A, s0)).order;
  // Hai bên ghi nội dung KHÁC NHAU: nếu bên thua lọt qua điều kiện, dòng tiền của nó sẽ đè lên bản của bên thắng và lệch với ghi chú đơn.
  const mine = (order, tag) => put(order, [manualService([{ description: tag.toUpperCase(), quantity: 1, unitPrice: 100000 }], { id: order.services[0].id })], { customerNote: tag });
  const [x, y] = await Promise.all([mine(cur, "x"), mine(cur, "y")]);
  assert.deepEqual([x.status, y.status].sort(), [200, 409], `${x.status}/${y.status}`);
  const winner = x.status === 200 ? "x" : "y";
  const after = await get(A, s0);
  assert.equal(after.order.services.length, 1);
  assert.equal(lines(after.order).length, 1, "bên thua không được nhân đôi dòng");
  assert.equal(after.order.customerNote, winner);
  assert.equal(lines(after.order)[0].description, winner.toUpperCase(), "dòng tiền phải là của bên thắng, không bị bên thua đè");
  assert.deepEqual(after.history.map((h) => h.action), ["created", "updated", "updated"]);
  console.log("✓ khoá lạc quan: stale / thiếu mốc / hai PUT cùng mốc");

  // 11) BẢN CHỤP CHO NHÁP CŨ (Q11): dịch vụ bị ẩn / đổi giá — nháp vẫn sửa và xác nhận được; đổi số khách thì phải chọn lại
  const sn = (await post([cat({ pax: { adult: 2 } })])).body.order;
  const snId = sn.services[0].id;
  const keep = (o, extra = {}) => put(o, [cat({ id: snId, pax: { adult: 2 }, ...extra })]);
  await sql("UPDATE catalog_item SET in_sheet = 0 WHERE code = 'ZT1'"); // rời khỏi Sheet → không còn hiện
  let v = (await get(A, sn)).order;
  assert.equal(v.services[0].catalogStatus, "unavailable");
  r = await keep(v);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  v = r.body.order;
  assert.deepEqual([v.services[0].catalogStatus, v.services[0].name], ["unavailable", "Tour thử"]);
  r = await put(v, [cat({ id: snId, pax: { adult: 3 }, catalogPriceSeen: { adult: 850000 } })]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  r = await post([cat()]);
  assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
  await sql("UPDATE catalog_item SET in_sheet = 1, price_adult = 700000 WHERE code = 'ZT1'"); // hiện lại, Sheet đổi giá 850k → 700k
  v = (await get(A, sn)).order;
  assert.equal(v.services[0].catalogStatus, "price_changed");
  assert.equal(lines(v)[0].unitPrice, 850000);
  r = await keep(v);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([lines(r.body.order)[0].unitPrice, lines(r.body.order)[0].catalogPrice], [850000, 850000], "giữ giá đã lưu");
  r = await confirm(A, r.body.order);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await sql("UPDATE catalog_item SET price_adult = 850000 WHERE code = 'ZT1'");
  console.log("✓ bản chụp: dịch vụ ẩn/đổi giá vẫn sửa + xác nhận được, đổi số khách thì phải chọn lại");

  // 12) SỬA TRƯỜNG VẬN HÀNH SAU XÁC NHẬN (Q9)
  const cf = (await post([cat({ pickupPlace: "KS Novotel phòng 1205" })])).body.order;
  r = await confirm(A, cf);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  let c = r.body.order;
  r = await trip(c, { pickupTime: "06:30", pickupPlace: "Sân bay Cam Ranh", note: "đổi giờ đón" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.order.status, r.body.order.services[0].pickupTime, r.body.order.services[0].pickupPlace], ["confirmed", "06:30", "Sân bay Cam Ranh"]);
  c = r.body.order;
  const last = (await get(A, c)).history.at(-1);
  assert.equal(last.action, "trip_updated");
  assert.match(last.detail, /giờ đón \(trống\) → 06:30/);
  assert.match(last.detail, /đổi điểm đón/);
  assert.ok(!last.detail.includes("Cam Ranh") && !last.detail.includes("Novotel"), "nhật ký không chứa địa điểm (dữ liệu cá nhân)");
  r = await trip(c, { departDate: vnDate(20) });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  c = r.body.order;
  for (const bad of [{ departDate: vnDate(-1) }, { departDate: vnDate(400) }, { departDate: "" }, { departTime: "24:00" }]) assert.equal((await trip(c, bad)).status, 400, JSON.stringify(bad));
  const n0 = (await get(A, c)).history.length;
  r = await trip(c, {}); // không đổi gì
  assert.equal(r.status, 200);
  assert.equal((await get(A, c)).history.length, n0, "không đổi gì thì không ghi nhật ký");
  r = await trip(c, { note: "x" }, A, cf.updatedAt); // mốc cũ
  assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
  assert.equal((await trip(c, { note: "x" }, Bc)).status, 403);
  r = await trip(c, { note: "admin sửa" }, ADMIN);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  c = r.body.order;
  // đơn đã xác nhận: sửa toàn bộ đơn bị từ chối; số khách/dịch vụ/ngày bị trigger giữ ngay cả khi ghi thẳng D1
  assert.equal((await put(c, same(c))).status, 409);
  const svId = c.services[0].id;
  await assert.rejects(sql(`UPDATE order_service SET pax_adult = 9 WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`UPDATE order_service SET name = 'Đổi tên' WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`DELETE FROM order_service WHERE id = '${svId}'`), /order_frozen/);
  await assert.rejects(sql(`INSERT INTO order_service (id, order_id, name, unit) VALUES ('zz1', '${c.id}', 'T', 'perPax')`), /order_frozen/);
  await assert.rejects(sql(`UPDATE order_service SET depart_date = NULL WHERE id = '${svId}'`), /incomplete_trip/);
  await sql(`UPDATE order_service SET note = 'ghi thẳng D1' WHERE id = '${svId}'`); // trường vận hành vẫn ghi được
  // ngày đã qua (đơn đã đi) vẫn sửa được ghi chú nếu KHÔNG đổi ngày
  const pd = (await post([manualService(tourLine, { departDate: vnDate(0) })])).body.order;
  assert.equal((await confirm(A, pd)).status, 200);
  await sql(`UPDATE order_service SET depart_date = '${vnDate(-3)}' WHERE order_id = '${pd.id}'`);
  const pdNow = (await get(A, pd)).order;
  r = await trip(pdNow, { note: "đã đi xong" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await trip(r.body.order, { departDate: vnDate(-2) })).status, 400, "ĐỔI sang ngày quá khứ vẫn bị chặn");
  // đơn huỷ: không sửa được chuyến
  r = await call(ADMIN, "POST", `/api/orders/${c.id}/status`, { status: "cancelled" });
  assert.equal(r.status, 200);
  assert.equal((await trip(r.body.order, { note: "sau huỷ" })).status, 409);
  console.log("✓ sửa trường vận hành sau xác nhận: có nhật ký, khoá số khách/dịch vụ, chặn ngày sai");

  // 13) BẤT BIẾN (Điều 8.3): kiểm bằng SQL trên MỌI đơn của lần chạy
  const noPax = await sqlRows(`SELECT COUNT(*) AS n FROM order_item i JOIN order_service s ON s.id = i.service_id WHERE s.catalog_code IS NOT NULL AND (i.pax_code IS NULL OR i.catalog_price IS NULL)`);
  assert.equal(noPax[0].n, 0, "dòng của dịch vụ danh mục phải có loại khách + giá danh mục");
  const skew = await sqlRows(`SELECT COUNT(*) AS n FROM order_item i JOIN order_service s ON s.id = i.service_id WHERE s.catalog_code IS NOT NULL AND (
      (s.unit = 'perPax' AND i.quantity <> CASE i.pax_code WHEN 'adult' THEN s.pax_adult WHEN 'child' THEN s.pax_child WHEN 'senior' THEN s.pax_senior WHEN 'infant' THEN s.pax_infant END)
      OR (s.unit = 'per5Pax' AND i.quantity <> (s.pax_adult + 4) / 5))`);
  assert.equal(skew[0].n, 0, "Σ số lượng dòng tiền phải khớp số khách của dịch vụ danh mục");
  const incomplete = await sqlRows(`SELECT COUNT(*) AS n FROM orders o WHERE o.status = 'confirmed' AND EXISTS (
      SELECT 1 FROM order_service s WHERE s.order_id = o.id AND (s.depart_date IS NULL OR s.pax_adult + s.pax_child + s.pax_senior + s.pax_infant < 1))`);
  assert.equal(incomplete[0].n, 0, "không có đơn xác nhận thiếu ngày/khách");
  const orphan = await sqlRows(`SELECT COUNT(*) AS n FROM order_item WHERE service_id IS NULL OR service_id NOT IN (SELECT id FROM order_service)`);
  assert.equal(orphan[0].n, 0, "mọi dòng tiền thuộc một dịch vụ");
  console.log("✓ bất biến SQL: số lượng khớp số khách, đơn xác nhận đủ chuyến, không dòng tiền mồ côi");
} finally {
  await sql("DELETE FROM catalog_override WHERE code LIKE 'ZT%'");
  await sql("DELETE FROM catalog_item WHERE code LIKE 'ZT%'");
}
console.log("E2E OK");
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
npm run test:e2e -- platform orders trip
```

Expected: `platform` XANH (đi qua shim); `orders` ĐỎ với `TypeError: Cannot read properties of undefined (reading 'flatMap')` (repository cũ còn trả `items`, chưa có `services`); `trip` ĐỎ với `AssertionError … actual: 400, expected: 201` (shim danh mục rỗng → dịch vụ `ZT1` "không còn trong danh mục"). Kết thúc `E2E: 2/3 kịch bản LỖI`. Cần đúng hai kịch bản đỏ này; nếu `orders` hay `trip` xanh thì test chưa kiểm được gì — dừng lại xem.

- [ ] **Bước 3: Commit (nhánh làm việc; ĐỎ cho tới Task 8)**

```bash
git add tests/e2e/lib.mjs tests/e2e/orders.mjs tests/e2e/platform.mjs tests/e2e/trip.mjs tests/e2e/run.mjs
git commit -m "e2e: kịch bản thông tin chuyến (viết trước; đỏ cho tới khi có repository mới)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 8: Ghi dữ liệu + điều phối + route (làm e2e XANH)

**Files:**
- Modify: `src/shared/contracts.ts` (đổi kiểu cũ), `src/modules/audit/repository.ts`, `src/modules/orders/repository.ts` (thay toàn bộ), `src/modules/orders/index.ts` (thay toàn bộ)
- Create: `src/modules/orders/service.ts`

**Interfaces:**
- Consumes: Task 3 (bảng/trigger), Task 4 (`getEffectiveServices`), Task 5 (`ServiceContext`, `StoredService`, `confirmGaps`, `confirmWindow`, `describeTripUpdates`, `summarizeDeviations`, `validateTripUpdate`, `catalogStatusOf`), Task 6 (`validateOrder`, `ValidOrder`, `Failure`, `canModify`, `canTransition`).
- Produces (HTTP — spec §4):
  - `POST /api/orders` → 201 `{ order }`; lỗi: 400 `invalid_input`/`catalog_unavailable`, 409 `catalog_changed` (thân có `changes[]`), 409 `client_outdated`.
  - `GET /api/orders/:id` → `order.services[]` (mỗi dịch vụ có `items[]`, và `catalogStatus` cho đơn nháp).
  - `PUT /api/orders/:id` — **bắt buộc `expectedUpdatedAt`**; 409 `stale` nếu lệch; 409 `not_editable` nếu không còn nháp; 400 nếu thiếu mốc.
  - `POST /api/orders/:id/status` — `confirmed`: 409 `incomplete_trip` (thân có `missing[]`) khi thiếu chuyến, **không ghi nhật ký**; `cancelled` như cũ.
  - `PUT /api/orders/:id/trip` — `{ expectedUpdatedAt, services: [{ id, ...TripInput }] }`: đơn nháp hoặc đã xác nhận; 409 `stale`; 409 `not_editable` (đã huỷ); không đổi gì → 200 và không ghi nhật ký. Trường vắng = xoá, nên client gửi ĐỦ thông tin chuyến.
- Produces (mã): `AuditInput.id?: string` (module audit); repository: `findOrder`, `getStoredServices`, `getMeta` (có `updatedAt`), `listOrders` (không đổi), `createOrder`, `updateDraftOrder`, `confirmOrder`, `cancelOrder` (thay `transitionOrder`), `updateTrip`; `service.ts`: `validationContext(db, orderId | null)`, `loadOrderView(db, id)`.

Hai điểm thiết kế cần giữ khi thi công (đã có e2e bảo vệ):
1. **`wonGuard`**: các câu `DELETE/INSERT` sau `UPDATE orders` đầu tiên mang điều kiện `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id do request tự sinh (`AuditInput.id`). Dòng nhật ký chỉ được chèn khi `changes() > 0` nên có mặt ⇔ UPDATE của CHÍNH request này đã thắng. Không dùng so mốc `updated_at`: hai request cùng mili-giây có thể tính ra cùng mốc mới và bên thua lọt qua.
2. **Điều kiện xác nhận nằm trong câu `UPDATE`** (`confirmOrder`), không đọc-rồi-ghi ở route; trigger `orders_confirm_requires_trip` là lưới thứ hai.

- [ ] **Bước 1: Đổi hợp đồng** — `src/shared/contracts.ts` (thêm `paxCode`/`catalogPrice` vào dòng tiền, `services` thay `items` của đơn, `services`/`expectedUpdatedAt` thay `items` của `OrderInput`)

```diff
--- a/src/shared/contracts.ts
+++ b/src/shared/contracts.ts
@@ -53,10 +53,14 @@
   id: string;
   /** Mã dịch vụ nguồn khi dòng sinh từ danh mục; null = nhập tay. */
   catalogCode: string | null;
+  /** Loại khách của dòng (dịch vụ tính theo nhóm: "adult" = số khách); null = nhập tay. */
+  paxCode: PaxCode | null;
   description: string;
   detail: string | null;
   quantity: number;
   unitPrice: number;
+  /** Giá danh mục hiệu lực lúc lập dòng; null = nhập tay. Lệch giá = `unitPrice ≠ catalogPrice` (hàm `priceDeviation` ở order-lines). */
+  catalogPrice: number | null;
   lineTotal: number;
 }
 
@@ -114,7 +118,7 @@
 }
 
 export interface OrderDetailDto extends OrderDto {
-  items: OrderItemDto[];
+  services: OrderServiceDto[];
 }
 
 export type OrderSummaryDto = Pick<
@@ -157,11 +161,13 @@
   customerPhone: string;
   customerEmail: string;
   customerNote: string;
-  items: { catalogCode: string | null; description: string; detail: string; quantity: number; unitPrice: number }[];
+  services: ServiceInput[];
   discount: number;
   depositAmount: number;
   depositMethod: DepositMethod | null;
   paymentNote: string;
+  /** Bắt buộc khi sửa (PUT): `updatedAt` của đơn mà form đã đọc — lệch → 409 `stale`. */
+  expectedUpdatedAt?: string;
 }
 
 /** `PUT /api/orders/:id/trip` — sửa trường vận hành (đơn nháp hoặc đã xác nhận). */
```

- [ ] **Bước 2: Cho phép người gọi chọn id dòng nhật ký** — `src/modules/audit/repository.ts`

```diff
--- a/src/modules/audit/repository.ts
+++ b/src/modules/audit/repository.ts
@@ -5,6 +5,12 @@
 export { isAuditAction, type AuditAction, type AuditTargetType };
 
 export interface AuditInput {
+  /**
+   * id do người gọi chọn (UUID mới) để CÁC CÂU SAU trong cùng batch hỏi "dòng này đã được ghi chưa" (`EXISTS (SELECT 1 FROM audit_log WHERE id = ?)`).
+   * Vì dòng chỉ được ghi khi `onlyIf` đúng (vd `changes() > 0`) và id là duy nhất cho request này, đó là cách chắc chắn để biết
+   * "UPDATE của chính tôi đã thắng" — khác với so mốc thời gian, có thể trùng khi hai request cùng mili-giây. Bỏ trống = tự sinh.
+   */
+  id?: string;
   /** Người thao tác; bỏ trống (null) = hệ thống tự làm (vd Cron đồng bộ Sheet). */
   staffId?: string | null;
   action: AuditAction;
@@ -29,7 +35,7 @@
       `INSERT INTO audit_log (id, order_id, staff_id, action, target_type, target_id, detail, created_at)
        SELECT ?, ?, ?, ?, ?, ?, ?, ? ${onlyIf ? `WHERE ${onlyIf}` : ""}`,
     )
-    .bind(crypto.randomUUID(), e.orderId ?? null, e.staffId ?? null, e.action, targetType, targetId, e.detail ?? null, e.at);
+    .bind(e.id ?? crypto.randomUUID(), e.orderId ?? null, e.staffId ?? null, e.action, targetType, targetId, e.detail ?? null, e.at);
 }
 
 export const SYSTEM_ACTOR_NAME = "Hệ thống (tự động)";
```

- [ ] **Bước 3: Thay toàn bộ `src/modules/orders/repository.ts`**

```ts
import { auditStatement } from "../audit";
import type { OrderDetailDto, OrderDto, OrderItemDto, OrderServiceDto, OrderSummaryDto } from "../../shared/contracts";
import { escapeLike } from "../../shared/http";
import type { PaxCode, PaxCounts } from "../../shared/order-lines";
import { orderCodePrefix, type DepositMethod, type OrderStatus, type ValidOrder } from "./rules";
import { confirmWindow, summarizeDeviations, type StoredService, type ValidService, type ValidTrip } from "./service-rules";

interface OrderRow {
  id: string;
  order_code: string;
  staff_id: string;
  staff_name: string;
  status: OrderStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  customer_note: string | null;
  subtotal: number;
  discount: number;
  total: number;
  deposit_amount: number;
  deposit_method: DepositMethod | null;
  remaining_amount: number;
  payment_note: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
}

interface ServiceRow {
  id: string;
  catalog_code: string | null;
  name: string;
  unit: string;
  pax_adult: number;
  pax_child: number;
  pax_senior: number;
  pax_infant: number;
  depart_date: string | null;
  depart_time: string | null;
  pickup_time: string | null;
  pickup_place: string | null;
  checkin_date: string | null;
  checkin_time: string | null;
  checkin_place: string | null;
  note: string | null;
}

interface ItemRow {
  id: string;
  service_id: string | null;
  catalog_code: string | null;
  pax_code: PaxCode | null;
  description: string;
  detail: string | null;
  quantity: number;
  unit_price: number;
  catalog_price: number | null;
  line_total: number;
}

const ORDER_SELECT = `SELECT o.*, s.full_name AS staff_name FROM orders o JOIN staff s ON s.id = o.staff_id`;
const SERVICE_SELECT = `SELECT id, catalog_code, name, unit, pax_adult, pax_child, pax_senior, pax_infant, depart_date, depart_time, pickup_time, pickup_place,
  checkin_date, checkin_time, checkin_place, note FROM order_service WHERE order_id = ? ORDER BY sort_order`;
const ITEM_SELECT = `SELECT id, service_id, catalog_code, pax_code, description, detail, quantity, unit_price, catalog_price, line_total FROM order_item WHERE order_id = ? ORDER BY sort_order`;

function toDto(r: OrderRow): OrderDto {
  return {
    id: r.id,
    orderCode: r.order_code,
    staffId: r.staff_id,
    staffName: r.staff_name,
    status: r.status,
    customerName: r.customer_name,
    customerPhone: r.customer_phone,
    customerEmail: r.customer_email,
    customerNote: r.customer_note,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    depositAmount: r.deposit_amount,
    depositMethod: r.deposit_method,
    remainingAmount: r.remaining_amount,
    paymentNote: r.payment_note,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    confirmedAt: r.confirmed_at,
  };
}

const paxOf = (s: ServiceRow): PaxCounts => ({ adult: s.pax_adult, child: s.pax_child, senior: s.pax_senior, infant: s.pax_infant });
const tripOf = (s: ServiceRow): ValidTrip => ({
  departDate: s.depart_date,
  departTime: s.depart_time,
  pickupTime: s.pickup_time,
  pickupPlace: s.pickup_place,
  checkinDate: s.checkin_date,
  checkinTime: s.checkin_time,
  checkinPlace: s.checkin_place,
  note: s.note,
});

function groupItems(rows: ItemRow[]): Map<string, ItemRow[]> {
  const by = new Map<string, ItemRow[]>();
  for (const i of rows) {
    if (!i.service_id) continue; // sau migration 0008 mọi dòng đều có dịch vụ
    const list = by.get(i.service_id);
    if (list) list.push(i);
    else by.set(i.service_id, [i]);
  }
  return by;
}

const toItemDto = (i: ItemRow): OrderItemDto => ({
  id: i.id,
  catalogCode: i.catalog_code,
  paxCode: i.pax_code,
  description: i.description,
  detail: i.detail,
  quantity: i.quantity,
  unitPrice: i.unit_price,
  catalogPrice: i.catalog_price,
  lineTotal: i.line_total,
});

/** Đơn + dịch vụ + dòng tiền. `catalogStatus` luôn null ở đây — do lớp điều phối (service.ts) điền cho đơn nháp. */
export async function findOrder(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const [orderRes, servicesRes, itemsRes] = await db.batch([
    db.prepare(`${ORDER_SELECT} WHERE o.id = ?`).bind(id),
    db.prepare(SERVICE_SELECT).bind(id),
    db.prepare(ITEM_SELECT).bind(id),
  ]);
  const row = (orderRes!.results as OrderRow[])[0];
  if (!row) return null;
  const items = groupItems(itemsRes!.results as ItemRow[]);
  const services = (servicesRes!.results as ServiceRow[]).map(
    (s): OrderServiceDto => ({
      id: s.id,
      kind: s.catalog_code === null ? "manual" : "catalog",
      catalogCode: s.catalog_code,
      name: s.name,
      unit: s.unit,
      pax: paxOf(s),
      ...tripOf(s),
      items: (items.get(s.id) ?? []).map(toItemDto),
      catalogStatus: null,
    }),
  );
  return { ...toDto(row), services };
}

export type StoredServiceRow = StoredService & { trip: ValidTrip };

/** Dịch vụ đã lưu của đơn ở dạng luật cần: đủ để dựng "bản chụp" (Q11) và so sánh thay đổi chuyến (Q9). */
export async function getStoredServices(db: D1Database, orderId: string): Promise<StoredServiceRow[]> {
  const [servicesRes, itemsRes] = await db.batch([db.prepare(SERVICE_SELECT).bind(orderId), db.prepare(ITEM_SELECT).bind(orderId)]);
  const items = groupItems(itemsRes!.results as ItemRow[]);
  return (servicesRes!.results as ServiceRow[]).map((s) => ({
    id: s.id,
    catalogCode: s.catalog_code,
    name: s.name,
    unit: s.unit,
    pax: paxOf(s),
    trip: tripOf(s),
    items: (items.get(s.id) ?? []).map((i) => ({ paxCode: i.pax_code, detail: i.detail, catalogPrice: i.catalog_price })),
  }));
}

export async function getMeta(db: D1Database, id: string): Promise<{ status: OrderStatus; staffId: string; updatedAt: string } | null> {
  const row = await db
    .prepare("SELECT status, staff_id, updated_at FROM orders WHERE id = ?")
    .bind(id)
    .first<{ status: OrderStatus; staff_id: string; updated_at: string }>();
  return row ? { status: row.status, staffId: row.staff_id, updatedAt: row.updated_at } : null;
}

export async function listOrders(
  db: D1Database,
  opts: { q: string; status: OrderStatus | null; limit: number; offset: number },
): Promise<{ orders: OrderSummaryDto[]; hasMore: boolean }> {
  const where: string[] = [];
  const binds: (string | number)[] = [];
  if (opts.status) {
    where.push("o.status = ?");
    binds.push(opts.status);
  }
  if (opts.q) {
    const like = `%${escapeLike(opts.q)}%`;
    where.push(`(o.order_code LIKE ? ESCAPE '\\' OR o.customer_name LIKE ? ESCAPE '\\' OR o.customer_phone LIKE ? ESCAPE '\\' OR s.full_name LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like, like);
  }
  const sql = `${ORDER_SELECT} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY o.created_at DESC, o.rowid DESC LIMIT ? OFFSET ?`;
  const { results } = await db
    .prepare(sql)
    .bind(...binds, opts.limit + 1, opts.offset)
    .all<OrderRow>();
  const page = results.slice(0, opts.limit).map((r) => {
    const d = toDto(r);
    return {
      id: d.id,
      orderCode: d.orderCode,
      status: d.status,
      customerName: d.customerName,
      customerPhone: d.customerPhone,
      total: d.total,
      remainingAmount: d.remainingAmount,
      staffName: d.staffName,
      createdAt: d.createdAt,
    };
  });
  return { orders: page, hasMore: results.length > opts.limit };
}

const isCodeCollision = (e: unknown) => e instanceof Error && /UNIQUE constraint failed: orders\.order_code/.test(e.message);

/** Mốc `updated_at` mới, luôn LỚN HƠN mốc cũ (dù đồng hồ lệch/cùng mili-giây) để điều kiện khoá lạc quan phân biệt được "đã ghi" với "chưa ghi". */
function nextStamp(prev: string): string {
  const p = Date.parse(prev);
  return new Date(Number.isNaN(p) ? Date.now() : Math.max(Date.now(), p + 1)).toISOString();
}

interface Guard {
  sql: string;
  binds: (string | number)[];
}

/**
 * Câu ghi chỉ chạy khi UPDATE đầu của CHÍNH request này đã thắng: dòng nhật ký mang id riêng của request (xem `AuditInput.id`) chỉ được chèn
 * khi `changes() > 0`, nên có mặt ⇔ UPDATE đã áp dụng (đơn còn nháp và đúng mốc `updated_at`). Không dùng so mốc thời gian vì hai request
 * cùng mili-giây có thể tính ra cùng mốc mới, khi đó bên thua vẫn lọt qua và xoá/ghi đè bản của bên thắng.
 */
const wonGuard = (auditId: string): Guard => ({ sql: "EXISTS (SELECT 1 FROM audit_log WHERE id = ?)", binds: [auditId] });

function insertRow(db: D1Database, table: string, cols: string[], values: (string | number | null)[], guard?: Guard): D1PreparedStatement {
  const marks = cols.map(() => "?").join(", ");
  if (!guard) return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) VALUES (${marks})`).bind(...values);
  return db.prepare(`INSERT INTO ${table} (${cols.join(", ")}) SELECT ${marks} WHERE ${guard.sql}`).bind(...values, ...guard.binds);
}

const SERVICE_COLS = [
  "id", "order_id", "sort_order", "catalog_code", "name", "unit", "pax_adult", "pax_child", "pax_senior", "pax_infant",
  "depart_date", "depart_time", "pickup_time", "pickup_place", "checkin_date", "checkin_time", "checkin_place", "note",
];
const ITEM_COLS = ["id", "order_id", "service_id", "catalog_code", "pax_code", "description", "detail", "quantity", "unit_price", "catalog_price", "line_total", "sort_order"];

/** INSERT các dịch vụ rồi các dòng tiền của chúng (dịch vụ trước vì dòng tiền trỏ khoá ngoại vào dịch vụ). */
function serviceInserts(db: D1Database, orderId: string, services: ValidService[], guard?: Guard): D1PreparedStatement[] {
  const stmts: D1PreparedStatement[] = [];
  const ids = services.map((s) => s.id ?? crypto.randomUUID());
  services.forEach((s, i) => {
    const t = s.trip;
    stmts.push(
      insertRow(
        db, "order_service", SERVICE_COLS,
        [ids[i]!, orderId, i, s.catalogCode, s.name, s.unit, s.pax.adult, s.pax.child, s.pax.senior, s.pax.infant,
          t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note],
        guard,
      ),
    );
  });
  let sort = 0;
  services.forEach((s, i) => {
    for (const it of s.items) {
      stmts.push(
        insertRow(
          db, "order_item", ITEM_COLS,
          [crypto.randomUUID(), orderId, ids[i]!, it.catalogCode, it.paxCode, it.description, it.detail, it.quantity, it.unitPrice, it.catalogPrice, it.lineTotal, sort++],
          guard,
        ),
      );
    }
  });
  return stmts;
}

/**
 * Tạo đơn + dịch vụ + dòng tiền + nhật ký trong một transaction. order_code được sinh NGAY TRONG câu INSERT
 * (mã lớn nhất của ngày + 1) nên việc đọc-rồi-ghi là một bước nguyên tử: D1 ghi tuần tự, nhiều người
 * tạo cùng lúc vẫn ra mã khác nhau. UNIQUE vẫn là lưới an toàn cuối; nếu đụng thì thử lại.
 */
export async function createOrder(db: D1Database, staffId: string, order: ValidOrder): Promise<string> {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; ; attempt++) {
    const now = new Date();
    const prefix = orderCodePrefix(now);
    const id = crypto.randomUUID();
    const at = now.toISOString();
    try {
      await db.batch([
        db
          .prepare(
            `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, customer_email, customer_note,
               subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, payment_note, created_at, updated_at)
             SELECT ?, ? || printf('%04d', COALESCE((SELECT MAX(CAST(substr(order_code, length(?) + 1) AS INTEGER)) FROM orders WHERE order_code LIKE ?), 0) + 1),
               ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?`,
          )
          .bind(
            id, prefix, prefix, `${prefix}%`, staffId, order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
            order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, at,
          ),
        ...serviceInserts(db, id, order.services),
        auditStatement(db, { orderId: id, staffId, action: "created", at, detail: summarizeDeviations(order.items) }),
      ]);
      return id;
    } catch (e) {
      if (!isCodeCollision(e) || attempt >= MAX_ATTEMPTS) throw e;
    }
  }
}

/**
 * Sửa đơn (chỉ khi còn `draft` VÀ `updated_at` còn khớp mốc client đã đọc). Trả false nếu UPDATE đầu không áp dụng (đơn đã đổi trạng thái
 * hoặc đã bị người khác sửa) — khi đó MỌI câu sau đều không chạy vì cùng mang `wonGuard`.
 * Thứ tự cố định vì khoá ngoại: xoá dòng tiền → xoá dịch vụ → thêm dịch vụ → thêm dòng tiền. Audit đứng ngay sau UPDATE (idiom `changes() > 0`).
 */
export async function updateDraftOrder(db: D1Database, id: string, staffId: string, order: ValidOrder & { expectedUpdatedAt: string }): Promise<boolean> {
  const at = nextStamp(order.expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_note = ?,
           subtotal = ?, discount = ?, total = ?, deposit_amount = ?, deposit_method = ?, remaining_amount = ?, payment_note = ?, updated_at = ?
         WHERE id = ? AND status = 'draft' AND updated_at = ?`,
      )
      .bind(
        order.customerName, order.customerPhone, order.customerEmail, order.customerNote,
        order.subtotal, order.discount, order.total, order.depositAmount, order.depositMethod, order.remainingAmount, order.paymentNote, at, id, order.expectedUpdatedAt,
      ),
    auditStatement(db, { id: auditId, orderId: id, staffId, action: "updated", at, detail: summarizeDeviations(order.items) }, "changes() > 0"),
    db.prepare(`DELETE FROM order_item WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    db.prepare(`DELETE FROM order_service WHERE order_id = ? AND ${guard.sql}`).bind(id, ...guard.binds),
    ...serviceInserts(db, id, order.services, guard),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * Xác nhận đơn: điều kiện "có dịch vụ, mọi dịch vụ có ngày khởi hành trong [hôm nay, +365 ngày] và ≥ 1 khách" nằm TRONG câu UPDATE
 * (không đọc-rồi-ghi ở route) nên người khác lưu nháp xoá ngày ngay trước đó cũng không thể tạo ra đơn xác nhận thiếu chuyến.
 * Trigger `orders_confirm_requires_trip` (0008) là lưới thứ hai cho phần không đổi của luật. Trả false nếu điều kiện không còn đúng.
 */
export async function confirmOrder(db: D1Database, id: string, staffId: string, today: string, detail?: string): Promise<boolean> {
  const at = new Date().toISOString();
  const { from, to } = confirmWindow(today);
  const results = await db.batch([
    db
      .prepare(
        `UPDATE orders SET status = 'confirmed', updated_at = ?, confirmed_at = ?
         WHERE id = ? AND status = 'draft'
           AND EXISTS (SELECT 1 FROM order_service WHERE order_id = orders.id)
           AND NOT EXISTS (
             SELECT 1 FROM order_service s WHERE s.order_id = orders.id
               AND (s.depart_date IS NULL OR s.depart_date < ? OR s.depart_date > ? OR s.pax_adult + s.pax_child + s.pax_senior + s.pax_infant < 1))`,
      )
      .bind(at, at, id, from, to),
    auditStatement(db, { orderId: id, staffId, action: "confirmed", at, detail }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/** Huỷ đơn có điều kiện `status = from` (chống hai người đổi cùng lúc). Trả false nếu điều kiện không còn đúng. */
export async function cancelOrder(db: D1Database, id: string, staffId: string, from: OrderStatus): Promise<boolean> {
  const at = new Date().toISOString();
  const results = await db.batch([
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = ?`).bind(at, id, from),
    auditStatement(db, { orderId: id, staffId, action: "cancelled", at }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}

/**
 * Sửa trường vận hành của các dịch vụ (Q9): đơn nháp HOẶC đã xác nhận, còn khớp mốc `updated_at`. Số khách, dịch vụ, tiền không đổi ở đây
 * (trigger 0008 chặn nếu một đường code quên). Trả false nếu đơn đã huỷ / đã bị người khác sửa.
 */
export async function updateTrip(
  db: D1Database,
  orderId: string,
  staffId: string,
  updates: { id: string; trip: ValidTrip }[],
  expectedUpdatedAt: string,
  detail: string,
): Promise<boolean> {
  const at = nextStamp(expectedUpdatedAt);
  const auditId = crypto.randomUUID();
  const guard = wonGuard(auditId);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET updated_at = ? WHERE id = ? AND status IN ('draft', 'confirmed') AND updated_at = ?`).bind(at, orderId, expectedUpdatedAt),
    auditStatement(db, { id: auditId, orderId, staffId, action: "trip_updated", at, detail }, "changes() > 0"),
    ...updates.map(({ id, trip: t }) =>
      db
        .prepare(
          `UPDATE order_service SET depart_date = ?, depart_time = ?, pickup_time = ?, pickup_place = ?, checkin_date = ?, checkin_time = ?, checkin_place = ?, note = ?
           WHERE id = ? AND order_id = ? AND ${guard.sql}`,
        )
        .bind(t.departDate, t.departTime, t.pickupTime, t.pickupPlace, t.checkinDate, t.checkinTime, t.checkinPlace, t.note, id, orderId, ...guard.binds),
    ),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}
```

- [ ] **Bước 4: Tạo `src/modules/orders/service.ts`** (điều phối có I/O: ngữ cảnh kiểm + bản xem đơn kèm `catalogStatus`)

```ts
// Điều phối có I/O của module orders: dựng ngữ cảnh kiểm (danh mục hiệu lực + dịch vụ đã lưu của đơn) và bản xem đơn kèm
// trạng thái so với danh mục hiện tại. Luật thuần nằm ở rules.ts / service-rules.ts; SQL ở repository.ts.
import type { OrderDetailDto } from "../../shared/contracts";
import { getEffectiveServices } from "../catalog";
import { findOrder, getStoredServices } from "./repository";
import { catalogStatusOf, type ServiceContext } from "./service-rules";

/**
 * Ngữ cảnh cho `validateOrder`: toàn bộ danh mục hiệu lực (~vài chục dòng, kể cả dịch vụ đang ẩn — có cờ `visible`) và, khi SỬA một đơn,
 * các dịch vụ đã lưu của đơn đó (để giữ bản chụp cho nháp cũ).
 */
export async function validationContext(db: D1Database, orderId: string | null): Promise<ServiceContext> {
  const [catalog, stored] = await Promise.all([getEffectiveServices(db), orderId ? getStoredServices(db, orderId) : Promise.resolve([])]);
  return { catalog, stored };
}

/** Đơn đầy đủ; với đơn NHÁP điền thêm `catalogStatus` (giá danh mục đã đổi / dịch vụ đã ẩn) để người sửa biết. */
export async function loadOrderView(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order || order.status !== "draft") return order;
  const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
  const catalog = await getEffectiveServices(db, codes);
  return { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) };
}
```

- [ ] **Bước 5: Thay toàn bộ `src/modules/orders/index.ts`** (bỏ shim; thêm `PUT /api/orders/:id/trip`, khoá lạc quan, xác nhận có điều kiện)

```ts
// Module orders — sổ đơn hàng (spec §2.1 order/order_service/order_item, §2.3 bất biến). Route: /api/orders*.
// Mọi nhân viên đang hoạt động xem được mọi đơn (§2.4-4); chỉ người lập đơn hoặc admin được sửa/xác nhận/huỷ.
import { getAuditTrail } from "../audit";
import type { CatalogChangeDto, CatalogChangedBody, IncompleteTripBody, OrderDetailResponse, OrderListResponse, OrderResponse } from "../../shared/contracts";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { vnToday } from "../../shared/vn-date";
import { cancelOrder, confirmOrder, createOrder, findOrder, getMeta, getStoredServices, listOrders, updateDraftOrder, updateTrip } from "./repository";
import { canModify, canTransition, isOrderStatus, validateOrder, type Failure } from "./rules";
import { loadOrderView, validationContext } from "./service";
import { confirmGaps, describeTripUpdates, summarizeDeviations, validateTripUpdate } from "./service-rules";

const FORBIDDEN = () => error(403, "forbidden", "Chỉ người lập đơn hoặc quản trị viên mới được thay đổi đơn này.");
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
    route("GET", "/api/orders", "staff", async ({ env, url }) => {
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

    route("POST", "/api/orders", "staff", async ({ env, request, staff }) => {
      const parsed = validateOrder(await readJson(request), await validationContext(env.DB, null));
      if (!parsed.ok) return failure(parsed);
      const id = await createOrder(env.DB, staff.id, parsed.value);
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse, 201);
    }),

    route("GET", "/api/orders/:id", "staff", async ({ env, params, staff }) => {
      if (!UUID_RE.test(params.id!)) return NOT_FOUND();
      const order = await loadOrderView(env.DB, params.id!);
      if (!order) return NOT_FOUND();
      return json({ order, history: await getAuditTrail(env.DB, order.id), canModify: canModify(staff, order) } satisfies OrderDetailResponse);
    }),

    route("PUT", "/api/orders/:id", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
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
    route("PUT", "/api/orders/:id/trip", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
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

    route("POST", "/api/orders/:id/status", "staff", async ({ env, request, params, staff }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const body = await readJson(request);
      const to = body?.status;
      if (to !== "confirmed" && to !== "cancelled") return error(400, "invalid_input", "Trạng thái đích phải là confirmed hoặc cancelled.");
      const meta = await getMeta(env.DB, id);
      if (!meta) return NOT_FOUND();
      if (!canModify(staff, meta)) return FORBIDDEN();
      const from = meta.status;
      if (!canTransition(from, to)) return error(409, "invalid_transition", `Không thể chuyển đơn từ "${from}" sang "${to}".`);

      if (to === "cancelled") {
        if (!(await cancelOrder(env.DB, id, staff.id, from))) return RACED();
      } else {
        const today = vnToday(new Date());
        const order = await findOrder(env.DB, id);
        const detail = order ? summarizeDeviations(order.services.flatMap((s) => s.items)) : undefined;
        if (!(await confirmOrder(env.DB, id, staff.id, today, detail))) {
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

- [ ] **Bước 6: Kiểm tra tĩnh và unit test**

```bash
npx tsc --noEmit && npm test
npx tsc --noEmit -p web
```

Expected: `tsc` gốc không lỗi; `# tests 88`, `# pass 88`. `tsc -p web` **đúng 4 lỗi** (phạm vi A2, không sửa ở A1):
`web/order-form.ts` — `'items' does not exist in type 'OrderInput'` và `Property 'items' does not exist on type 'OrderDetailDto'`; `web/order.ts` — `Property 'items' does not exist on type 'OrderDetailDto'` và `Parameter 'it' implicitly has an 'any' type`.

- [ ] **Bước 7: e2e phải XANH**

```bash
npm run test:e2e -- platform orders trip
npm run test:e2e
```

Expected (lệnh đầu): `E2E: 3/3 kịch bản xanh`. Lệnh sau chạy đủ 6 kịch bản (`platform orders trip admin catalog admin-race`, **cần mạng** cho `admin`/`catalog` vì đọc Google Sheet thật): `E2E: 6/6 kịch bản xanh`. Trong `trip` phải thấy đủ 12 dòng `✓`.

- [ ] **Bước 8 (khuyến nghị, không commit): kiểm e2e có bắt lỗi thật** — lần lượt (a) đổi `wonGuard` thành `({ sql: "1 = 1", binds: [] })`, (b) đổi `AND updated_at = ?` trong `UPDATE orders` của `updateDraftOrder` thành `AND (updated_at = ? OR 1 = 1)`, (c) bỏ khối `AND NOT EXISTS (…)` khỏi câu `UPDATE` của `confirmOrder`; sau mỗi thay đổi chạy `npm run test:e2e -- trip` → **phải ĐỎ**; rồi khôi phục. Phiên soạn kế hoạch đã làm cả ba và cả ba đều bị bắt.

- [ ] **Bước 9: Commit**

```bash
git add src/shared/contracts.ts src/modules/audit/repository.ts src/modules/orders/repository.ts src/modules/orders/service.ts src/modules/orders/index.ts
git commit -m "orders: ghi dịch vụ + dòng tiền, xác nhận có điều kiện trong SQL, khoá lạc quan, sửa trường vận hành sau xác nhận" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---
### Task 10 (bổ sung, còn gọi Task 8b — làm SAU Task 8, TRƯỚC Task 9): dịch vụ nhóm bỏ qua khách loại khác; ký tự điều khiển Unicode

> Đánh số 10 (không phải "8b") chỉ để script `task-brief` của kỹ năng SDD trích riêng được: `task-brief PLAN 8` khớp cả "Task 8b" và sẽ nuốt mục này vào brief Task 8. Thứ tự thi công: 8 → **10 (= 8b)** → 9. Trong ledger/handoff gọi là "Task 8b".

**Nguồn (phán quyết của controller khi thi công, ghi trong ledger SDD):**
1. Review Task 2 chỉ ra dịch vụ tính theo **nhóm** (`per5Pax`…) bỏ qua âm thầm số khách các loại khác `adult`: `{adult:3, child:2}` lưu `pax_child = 2` mà không có dòng tiền nào — khách được ghi nhận nhưng không tính tiền (trái spec §4.2 "loại khách không có giá thì phải bằng 0"; làm lệch bất biến "Σ số lượng = số khách").
2. Review Task 5 chỉ ra `cleanText` chế độ nhiều dòng để lọt U+2028/U+2029 (giả xuống dòng) và ký tự điều hướng hai chiều U+200E/F, U+202A–202E, U+2066–2069 (đảo chiều chữ) vào PNG/PDF của M4. Cố ý KHÔNG bỏ U+200B–200D (cần cho emoji ghép).

Làm **SAU Task 8** (không sửa sớm để giữ đối chiếu chính xác các Task 3–8). Đã dựng và chạy thử trước trên bản sao: bước ĐỎ đúng 3 test đỏ; sau khi cài đặt `# tests 91`, `tsc` gốc sạch, e2e `platform orders trip` 3/3 xanh.

**Files:**
- Modify: `src/shared/order-lines.ts`, `src/modules/orders/fields.ts`
- Test: `src/shared/order-lines.test.ts`, `src/modules/orders/service-rules.test.ts`, `tests/e2e/trip.mjs`

**Interfaces:**
- Consumes: Task 2 (`buildLines`), Task 5 (`cleanText`, `validateTrip`), Task 7/8 (e2e `trip.mjs`, route `POST /api/orders`).
- Produces: `buildLines` trả `{ ok: false, message: "Dịch vụ tính theo nhóm chỉ nhập một ô số khách, không tách trẻ em / người cao tuổi / em bé." }` khi dịch vụ là nhóm và một loại khác `adult` có số khách > 0 (đường máy chủ báo lỗi 400 với tiền tố "Dịch vụ N: "); `cleanText` bỏ thêm `U+2028 U+2029 U+200E U+200F U+202A–202E U+2066–2069`.

- [ ] **Bước 1: Viết test (ĐỎ)** — sửa ba file test

```diff
--- a/src/shared/order-lines.test.ts
+++ b/src/shared/order-lines.test.ts
@@ -61,6 +61,15 @@
   assert.match((buildLines({ ...tour, unit: "perGroup" }, { adult: 1 }) as { message: string }).message, /chưa hỗ trợ/);
 });
 
+test("theo nhóm: số khách loại khác adult bị từ chối (không lưu khách mà không tính tiền)", () => {
+  for (const other of ["child", "senior", "infant"] as const) {
+    const r = buildLines(banana, { adult: 3, [other]: 1 });
+    assert.ok(!r.ok, other);
+    assert.match((r as { message: string }).message, /tính theo nhóm/);
+  }
+  assert.ok(buildLines(banana, { adult: 3, child: 0, senior: 0, infant: 0 }).ok); // 0 khách loại khác vẫn hợp lệ
+});
+
 test("loại khách hiện bộ đếm", () => {
   assert.deepEqual(availableCodes(tour), ["adult", "child", "senior", "infant"]);
   assert.deepEqual(availableCodes(jetski), ["adult"]);
```

```diff
--- a/src/modules/orders/service-rules.test.ts
+++ b/src/modules/orders/service-rules.test.ts
@@ -59,6 +59,12 @@
   assert.match(bad(catalogInput({ unitPrices: { adult: -1 } })).message, /đơn giá/);
 });
 
+test("danh mục: dịch vụ tính theo nhóm không nhận số khách loại khác adult", () => {
+  const r = bad({ kind: "catalog", catalogCode: "TTB03", pax: P(3, 1), catalogPriceSeen: { adult: 1000000 } });
+  assert.match(r.message, /Dịch vụ 1: .*tính theo nhóm/);
+  ok({ kind: "catalog", catalogCode: "TTB03", pax: P(3), catalogPriceSeen: { adult: 1000000 } });
+});
+
 test("danh mục: cần ≥ 1 khách không phải em bé; trần 50 khách; số khách phải là số nguyên", () => {
   assert.match(bad(catalogInput({ pax: P(0, 0, 0, 2), catalogPriceSeen: { infant: 0 } })).message, /không phải em bé/);
   assert.match(bad(catalogInput({ pax: P(0) })).message, /không phải em bé/);
@@ -141,6 +147,14 @@
   assert.deepEqual([v.kind, v.catalogCode, v.unit, v.name], ["manual", null, "manual", "Thuê áo phao"]);
   assert.deepEqual(v.items.map((i) => [i.description, i.quantity, i.unitPrice, i.lineTotal, i.paxCode, i.catalogPrice, i.catalogCode]), [["Áo phao", 3, 50000, 150000, null, null, null]]);
   assert.equal(ok(manualInput({ pax: P(0) })).pax.adult, 0); // 0 khách lưu nháp được; chỉ chặn lúc xác nhận
+});
+
+test("chuyến: U+2028/2029 và ký tự điều hướng hai chiều bị bỏ (không giả xuống dòng, không đảo chiều chữ trong mẫu xuất); giữ nối độ rộng 0 của emoji", () => {
+  const r = validateTrip({ note: "a b c‮d⁦e", pickupPlace: "x‏y‎z", checkinPlace: "👨‍👩" }, "D");
+  assert.ok(r.ok);
+  assert.equal(r.value.note, "a b c d e");
+  assert.equal(r.value.pickupPlace, "x y z");
+  assert.equal(r.value.checkinPlace, "👨‍👩");
 });
 
 test("nhập tay: tên và dòng tiền bắt buộc, kiểm số nguyên/khoảng như dòng nhập tay cũ", () => {
```

```diff
--- a/tests/e2e/trip.mjs
+++ b/tests/e2e/trip.mjs
@@ -66,6 +66,7 @@
   assert.equal(r.status, 400); assert.equal(r.body.error.code, "catalog_unavailable");
   const rejected = [
     [cat({ catalogCode: "ZT3", pax: { adult: 1, child: 1 }, catalogPriceSeen: { adult: 800000 } }), /không có giá cho trẻ em/],
+    [cat({ catalogCode: "ZT2", pax: { adult: 3, child: 1 }, catalogPriceSeen: { adult: 1000000 } }), /tính theo nhóm/],
     [cat({ pax: { adult: 51 }, catalogPriceSeen: { adult: 850000 } }), /số khách người lớn/],
     [cat({ pax: { adult: 30, child: 21 } }), /tối đa 50 khách/],
     [cat({ pax: { infant: 2 }, catalogPriceSeen: { infant: 0 } }), /không phải em bé/],
```

- [ ] **Bước 2: Chạy, phải đỏ**

```bash
node --test src/shared/order-lines.test.ts src/modules/orders/service-rules.test.ts
```

Expected: FAIL đúng 3 test (`# pass 33`, `# fail 3`): `theo nhóm: số khách loại khác adult bị từ chối…`, `danh mục: dịch vụ tính theo nhóm không nhận số khách loại khác adult`, `chuyến: U+2028/2029 và ký tự điều hướng hai chiều bị bỏ…`.

- [ ] **Bước 3: Cài đặt** — sửa hai file nguồn

```diff
--- a/src/shared/order-lines.ts
+++ b/src/shared/order-lines.ts
@@ -92,6 +92,10 @@
   if (paxTotal(counts) > MAX_GUESTS_PER_SERVICE) return { ok: false, message: `Tối đa ${MAX_GUESTS_PER_SERVICE} khách mỗi dịch vụ.` };
 
   if (unit.kind === "group") {
+    // Dịch vụ tính theo nhóm chỉ có MỘT ô "số khách" (ở `adult`). Số khách loại khác sẽ được lưu mà không có dòng tiền nào → từ chối.
+    if (PAX_ORDER.some((c) => c !== "adult" && (counts[c] ?? 0) > 0)) {
+      return { ok: false, message: "Dịch vụ tính theo nhóm chỉ nhập một ô số khách, không tách trẻ em / người cao tuổi / em bé." };
+    }
     const guests = counts.adult ?? 0;
     if (guests <= 0) return { ok: false, message: "Nhập số khách." };
     if (item.prices.adult === null) return { ok: false, message: "Dịch vụ này chưa có giá." };
```

```diff
--- a/src/modules/orders/fields.ts
+++ b/src/modules/orders/fields.ts
@@ -21,8 +21,11 @@
   return { value: v };
 }
 
-const CONTROL_KEEP_NEWLINE = /[\u0000-\u0009\u000b-\u001f\u007f]/g;
-const CONTROL_ALL = /[\u0000-\u001f\u007f]/g;
+// Ký tự điều khiển ASCII + dấu tách dòng/đoạn Unicode (U+2028/2029 — giả xuống dòng) + dấu điều hướng hai chiều (U+200E/F, 202A–202E, 2066–2069 — đảo chiều chữ).
+// Cố ý KHÔNG bỏ U+200B–200D (khoảng trắng/nối độ rộng 0): cần cho emoji ghép.
+const UNICODE_LAYOUT = "\\u2028\\u2029\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069";
+const CONTROL_KEEP_NEWLINE = new RegExp(`[\\u0000-\\u0009\\u000b-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");
+const CONTROL_ALL = new RegExp(`[\\u0000-\\u001f\\u007f${UNICODE_LAYOUT}]`, "g");
 
 /**
  * Chuỗi tự do đi vào PNG/PDF (điểm đón, nơi check-in, ghi chú): bỏ ký tự điều khiển như booking (`schema.ts` của tourdaovn),
```

- [ ] **Bước 4: Chạy, phải xanh**

```bash
npm test && npx tsc --noEmit
npm run test:e2e -- platform orders trip
```

Expected: `# tests 91`, `# pass 91`; `tsc` gốc không lỗi; `E2E: 3/3 kịch bản xanh` (dòng `✓ đầu vào sai bị từ chối đúng lý do` trong `trip` đã gồm ca `ZT2 {adult:3, child:1}` → 400 "tính theo nhóm"). `tsc -p web` vẫn đúng 4 lỗi của A2.

- [ ] **Bước 5: Commit**

```bash
git add src/shared/order-lines.ts src/shared/order-lines.test.ts src/modules/orders/fields.ts src/modules/orders/service-rules.test.ts tests/e2e/trip.mjs
git commit -m "Gia cố: dịch vụ nhóm từ chối số khách loại khác adult; cleanText bỏ U+2028/2029 và ký tự điều hướng hai chiều" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Sau Task 8b, các số kỳ vọng ở Task 9 Bước 10 là `# tests 91`.

---

### Task 9: Đồng bộ tài liệu với mã và kiểm tra cuối

**Files:**
- Modify: `docs/SPEC-tourdao-sales.md`, `docs/ARCHITECTURE.md`, `docs/HANDOFF-M4.md`, `tests/e2e/README.md`, `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`

**Interfaces:**
- Consumes: kết quả Task 3–8 (schema, luật, route).
- Produces: tài liệu mô tả đúng hiện trạng (Điều 6.1 / P4: mã lệch tài liệu là lỗi).

Các bước 1–9 làm **theo đúng thứ tự** — mỗi điểm neo (anchor) đã được kiểm là duy nhất ở trạng thái file SAU các bước trước đó (đã chạy thử toàn bộ chuỗi trên bản sao tài liệu; xem Bước 10). Với Edit tự động: khớp cả dòng, không khớp một phần.

- [ ] **Bước 1: `docs/SPEC-tourdao-sales.md` §2.1 — thêm bảng `order_service`** ngay TRƯỚC dòng `` **`order_item`** — dòng sản phẩm/dịch vụ trong đơn (1 đơn nhiều dòng) ``

Chèn nguyên khối sau (và một dòng trống sau nó):

```markdown
**`order_service`** — một dịch vụ trong đơn (migration 0008; spec `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`): số khách theo loại + thông tin chuyến. Tiền ở `order_item`.
| Trường | Kiểu | Ghi chú |
|---|---|---|
| id | TEXT (uuid) | khoá chính; đơn cũ được chuyển thành dịch vụ nhập tay dùng lại id của dòng tiền |
| order_id | TEXT | FK → orders.id, `ON DELETE CASCADE` |
| sort_order | INTEGER | thứ tự của dịch vụ trong đơn |
| catalog_code | TEXT (nullable) | mã dịch vụ nguồn; NULL = nhập tay. Không FK |
| name / unit | TEXT | tên và chuỗi đơn vị của Sheet (`perPax`, `per5Pax`…) chụp lúc lập đơn; `unit = 'manual'` = nhập tay |
| pax_adult / pax_child / pax_senior / pax_infant | INTEGER | số khách theo loại, ≥ 0; tổng ≤ 50 kiểm ở code (`MAX_GUESTS_PER_SERVICE`). Dịch vụ chỉ một loại giá (giá chung/theo nhóm): số khách nằm ở `pax_adult` |
| depart_date | TEXT (nullable) | `YYYY-MM-DD`, giờ Việt Nam, `CHECK` đúng lịch. Bắt buộc khi xác nhận (§2.3) |
| depart_time / pickup_time / checkin_time | TEXT (nullable) | `HH:MM` 00:00–23:59 (`CHECK`) |
| pickup_place / checkin_place | TEXT (nullable) | ≤ 200 ký tự, đã bỏ ký tự điều khiển — dữ liệu cá nhân, không ghi vào nhật ký |
| checkin_date | TEXT (nullable) | NULL = cùng ngày khởi hành |
| note | TEXT (nullable) | ghi chú riêng của dịch vụ, ≤ 1000 ký tự |
```

- [ ] **Bước 2: `docs/SPEC-tourdao-sales.md` §2.1 — sửa bảng `order_item`**

Thay dòng `| detail | TEXT | tuỳ chọn: ngày khởi hành, số khách, ghi chú dòng |` bằng:

```markdown
| detail | TEXT | tuỳ chọn: ghi chú loại khách (sinh từ danh mục) hoặc ghi chú dòng nhập tay — ngày khởi hành và số khách nằm ở `order_service` |
```

Rồi chèn ba dòng sau ngay SAU dòng `| sort_order | INTEGER | thứ tự hiển thị |`. Dòng này giờ vẫn **duy nhất** (thuộc bảng `order_item`): bảng `order_service` ở Bước 1 cố ý dùng câu chữ khác cho hàng `sort_order` — nếu thấy hai dòng trùng thì đã chèn nhầm khối ở Bước 1.

```markdown
| service_id | TEXT | FK → order_service.id; dòng tiền thuộc một dịch vụ (trigger bảo đảm cùng đơn) |
| catalog_price | INTEGER (nullable) | giá danh mục hiệu lực lúc lập dòng; NULL = nhập tay. Lệch giá = `unit_price ≠ catalog_price` |
| pax_code | TEXT (nullable) | loại khách của dòng: `adult` \| `child` \| `senior` \| `infant`; NULL = nhập tay |
```

- [ ] **Bước 3: `docs/SPEC-tourdao-sales.md` §2.2 — sửa sơ đồ quan hệ**

Thay dòng `staff (1) ──< order (N) ──< order_item (N) ··· catalog_item (order_item.catalog_code, không FK)` bằng:

```text
staff (1) ──< order (N) ──< order_service (N) ──< order_item (N) ··· catalog_item (catalog_code, không FK)
```

- [ ] **Bước 4: `docs/SPEC-tourdao-sales.md` §2.3 — thêm hai bất biến**

Chèn hai gạch đầu dòng sau ngay TRƯỚC dòng `- Tiền tệ luôn là số nguyên VNĐ (không dùng float) — nguyên tắc chống sai số cộng dồn.`:

```markdown
- **Xác nhận đòi đủ chuyến (migration 0008):** đơn chỉ chuyển `draft → confirmed` khi có ít nhất một dịch vụ và MỌI dịch vụ có `depart_date` trong khoảng [hôm nay, +365 ngày] (giờ Việt Nam) và ≥ 1 khách. Điều kiện nằm trong chính câu `UPDATE` xác nhận (không đọc-rồi-ghi ở route) và có trigger `orders_confirm_requires_trip` làm lưới thứ hai; xác nhận thất bại không ghi nhật ký. Nháp lưu được khi thiếu ngày.
- **Sau khi xác nhận:** dịch vụ, số khách và tiền **khoá** (trigger `order_service_frozen_*`); chỉ **trường vận hành** (ngày giờ khởi hành, đón, check-in, ghi chú dịch vụ) sửa được qua `PUT /api/orders/:id/trip`, có nhật ký `trip_updated`. Ngày khởi hành không được xoá, và nếu ĐỔI thì ngày mới phải trong khoảng cho phép. Muốn đổi khách/dịch vụ/tiền thì huỷ và lập đơn mới.
```

- [ ] **Bước 5: `docs/SPEC-tourdao-sales.md` §7 — thêm một dòng vào bảng phân loại quyết định**

Chèn ngay SAU dòng bắt đầu bằng `` | Schema `order`/`order_item`/`company_profile` ``:

```markdown
| Schema `order_service` (thông tin chuyến theo dịch vụ, migration 0008) | Một chiều (đổi schema sau khi có dữ liệu thật thì tốn kém) | Chủ dự án duyệt 2026-09-19 (spec thông tin chuyến, Q6). Phương án bị loại: thêm cột chuyến vào `order_item` (chép lặp, dễ lệch); bỏ `order_item` (viết lại chốt chặn tiền, xuất file, trang đơn) |
```

- [ ] **Bước 6: `docs/ARCHITECTURE.md` — cạnh phụ thuộc mới và luật ngày giờ**

Ở cuối dòng bắt đầu bằng `` 1. **Module khác chỉ import `index.ts`** `` thêm câu (giữ dấu cách đầu):

```markdown
 Cạnh `orders → catalog` chỉ qua hàm công khai `getEffectiveServices` (giá hiệu lực + cờ `visible`); `GET /api/catalog` dùng cùng nguồn `toEffective` để lọc "đang hiện" — không có hai nguồn "giá hiệu lực". Đồ thị vẫn không vòng (`catalog` không import `orders`).
```

Chèn hai gạch đầu dòng sau ngay SAU dòng bắt đầu bằng `` - Thời gian: `TEXT` ISO-8601 UTC ``:

```markdown
- Ngày/giờ **dân sự** (ngày khởi hành, giờ đón, check-in): `TEXT` `YYYY-MM-DD` / `HH:MM` theo **giờ Việt Nam**, không phải UTC. "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; không dùng `date('now')` (UTC, sai ngày trong 00:00–07:00 giờ VN). `CHECK` chỉ kiểm khuôn dạng (bất biến); khoảng cho phép (không quá khứ, ≤ 365 ngày) là luật đổi được nên nằm ở code.
- Batch ghi nhiều bảng sau một `UPDATE` điều kiện (vd sửa đơn nháp): các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id nhật ký do request tự sinh (`AuditInput.id`) — dòng chỉ được chèn khi `changes() > 0`, nên có mặt ⇔ UPDATE của chính request đó đã thắng. Không so mốc thời gian để suy ra ai thắng.
```

- [ ] **Bước 7: `docs/HANDOFF-M4.md` — M4 đọc thông tin chuyến từ `order_service`**

Chèn gạch đầu dòng sau ngay SAU dòng bắt đầu bằng `- Đơn lưu sẵn mọi thứ để dựng mẫu:` (mục "Điều M4 dùng lại"):

```markdown
- **Thông tin chuyến (2026-09-19, spec `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md`, phần A):** mẫu xác nhận đọc từ `order_service` — mỗi dịch vụ có ngày giờ khởi hành, giờ + điểm đón, check-in (ngày trống = ngày khởi hành), ghi chú và số khách theo loại; dòng tiền của dịch vụ nằm ở `items`. Điểm đón/ghi chú là dữ liệu cá nhân của khách: đưa lên mẫu được, **không** đưa vào nhật ký. Đơn đã xác nhận vẫn đổi được các trường này (`trip_updated`) — mẫu đã xuất trước đó có thể lỗi thời.
```

- [ ] **Bước 8: `tests/e2e/README.md` — thêm kịch bản `trip`**

Chèn dòng sau ngay SAU dòng bắt đầu bằng `` | `orders.mjs` ``:

```markdown
| `trip.mjs` | thông tin chuyến theo dịch vụ, dùng danh mục **giả** `ZT*` chèn thẳng vào D1 (không cần Sheet, dọn ở `finally`): dòng tiền do máy chủ sinh, lệch giá, `catalog_changed`, xác nhận đòi đủ chuyến (thiếu ngày/quá khứ/quá xa/0 khách), đua "lưu xoá ngày" với xác nhận, khoá lạc quan `stale`, bản chụp dịch vụ đã ẩn/đổi giá, sửa trường vận hành sau xác nhận, bất biến SQL |
```

- [ ] **Bước 9: Ghi sai khác thi công vào spec** — thêm mục cuối `docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md` (sau một dòng trống):

```markdown
## 11. Ghi chú thi công A1 (sai khác so với bản 2)

Phát sinh khi lập và chạy kế hoạch A1 (`docs/superpowers/plans/2026-09-19-thong-tin-chuyen-di-a1.md`); mã là nguồn sự thật:

- **`order_item.pax_code`** (thêm vào §3): loại khách của dòng tiền, `CHECK` bốn mã, NULL = nhập tay. Cần để dựng "bản chụp" (Q11) và hiển thị mà không phải suy từ thứ tự dòng.
- **Guard sau UPDATE (đổi §4.3):** khoá lạc quan vẫn là `UPDATE … AND updated_at = ?`, nhưng các câu ghi sau nó KHÔNG so lại mốc thời gian mà hỏi `EXISTS` dòng nhật ký có id riêng của request (`AuditInput.id`). Lý do: hai request cùng mili-giây tính ra cùng mốc mới, bên thua sẽ lọt qua và ghi đè bản của bên thắng.
- **Không có `priceWarnings` trong phản hồi** (đã ghi ở §4.1): lệch giá = `unit_price ≠ catalog_price`, một hàm `priceDeviation` cho mọi nơi.
- **`unitPrices` tuỳ chọn** khi tạo/sửa: vắng = giá danh mục; `catalogPriceSeen` bắt buộc cho mỗi loại có khách của dịch vụ mới/đổi thành phần.
- **`PUT /api/orders/:id/trip` thay TOÀN BỘ** thông tin chuyến của các dịch vụ được liệt kê (trường vắng = xoá) — client gửi đủ.
- **Trigger `orders_confirm_requires_trip` chỉ bắn lúc CHUYỂN sang xác nhận** (`OLD.status <> 'confirmed'`), để không chặn nhầm cập nhật sau đó và đơn cũ đã xác nhận trước migration.
- **`GET /api/orders` (danh sách)** chưa có `nextDepartDate` / lọc `?depart=` — thuộc A3 như §9.
```

- [ ] **Bước 10: Kiểm tra cuối**

```bash
npm test
npx tsc --noEmit
npx tsc --noEmit -p web
npm run test:e2e
git status --short
git diff --stat
git log --oneline -12
```

Expected: `npm test` `# tests 91`, `# pass 91`, `# fail 0` (sau Task 8b); `tsc` gốc không lỗi; `tsc -p web` **đúng 4 lỗi** (A2); `npm run test:e2e` → `E2E: 6/6 kịch bản xanh`; `git status` sạch (chỉ còn thay đổi tài liệu của bước này nếu chưa commit).

- [ ] **Bước 11: Commit**

```bash
git add docs/SPEC-tourdao-sales.md docs/ARCHITECTURE.md docs/HANDOFF-M4.md tests/e2e/README.md docs/superpowers/specs/2026-09-19-thong-tin-chuyen-di-design.md
git commit -m "Tài liệu: đồng bộ SPEC/ARCHITECTURE/HANDOFF/e2e README với thông tin chuyến theo dịch vụ (A1)" -m "Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

**Không làm ở A1:** áp migration 0008 lên remote, deploy, sửa `web/`, merge vào `main`. Báo chủ dự án: A1 xong, `main` chưa đổi; bước tiếp theo là kế hoạch A2 (giao diện) — A1 + A2 cùng xong mới merge/deploy (áp `0008` remote → deploy, chủ dự án chạy; kiểm `wrangler d1 migrations list --remote` trước vì `HANDOFF-M4` và bộ nhớ dự án ghi khác nhau về `0007`).

---

## Đối chiếu spec → task (kiểm độ phủ)

| Yêu cầu trong spec | Task |
|---|---|
| §3 bảng `order_service`, cột `order_item`, trigger, backfill trước trigger | 3 |
| §3 `CHECK` chỉ bất biến; trần 50 ở code (một hằng) | 2, 3 |
| §4.1 hợp đồng `ServiceInput`/`OrderServiceDto`/mã lỗi | 5, 8 |
| §4.2 dịch vụ danh mục: máy chủ sinh dòng, bản chụp (Q11), `catalog_changed`, tối thiểu khách | 5 |
| §4.2 dịch vụ nhập tay (Q10), chuẩn hoá chuỗi tự do, ngày giờ chặt | 1, 5 |
| §4.2 `checkConfirmable` → `confirmGaps` (Q4 + Q12) | 5, 8 |
| §4.3 thứ tự ghi khi sửa nháp; xác nhận có điều kiện trong SQL; khoá lạc quan | 8 |
| §4.3 sửa trường vận hành sau xác nhận (Q9) + nhật ký `trip_updated` không chứa PII | 5, 8 |
| §4.3 ranh giới module `orders → catalog` qua `index.ts` | 4, 8 |
| §4.3 kích thước batch (≤ 74 câu) | 7 (đơn nhiều dịch vụ ở `orders.mjs` 30 song song; giới hạn D1 production **chưa kiểm chứng** — xem rủi ro) |
| §6 tương thích: tab cũ → `client_outdated` | 6, 7 |
| §6 cập nhật tài liệu (Điều 6.1) | 9 |
| §7 kiểm thử: unit + e2e (đua, stale, bản chụp, bất biến SQL) | 1–8 |
| §9 chỉ A1 (không giao diện / danh sách / Guide) | Global Constraints |

## Rủi ro còn mở (không chặn A1)

- **Giới hạn số câu của một `db.batch` trên D1 production chưa kiểm chứng.** Đơn lớn nhất hợp lệ ≈ 1 + 1 + 2 + 20 dịch vụ + 50 dòng = 74 câu (hiện là 52). `wrangler dev` không thực thi giới hạn này. Trước khi triển khai: đọc tài liệu giới hạn D1; nếu batch không đủ thì **hạ** `MAX_SERVICES`/`MAX_LINES_PER_ORDER` (không chia lô — mất tính nguyên tử).
- **`0007` trên remote:** `HANDOFF-M4` ghi "chưa áp", bộ nhớ dự án ghi "đã áp" — kiểm bằng `npx wrangler d1 migrations list tourdao-sales-db --remote` trước khi áp `0008`.
- **Đơn cũ ở D1 local** (không có khách/ngày) sau backfill chưa xác nhận được cho tới khi nhập đủ — chỉ ảnh hưởng dữ liệu thử; remote có 0 đơn.
