# Sửa số khách/dịch vụ sau xác nhận cho FIELD — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route mới cho `FIELD` đang phụ trách một đơn đã xác nhận: đổi số khách của các dịch vụ từ danh mục, ghi lại bằng một dòng điều chỉnh chỉ-thêm (không sửa đè `order_service`/`order_item`/cột tiền của `orders`), giá tính lại theo giá đã chụp lúc lập đơn. Màn hình đơn (CTV/kế toán/quản trị) sau đó hiện SỐ MỚI (gốc + điều chỉnh gần nhất).

**Architecture:** Bảng mới `order_money_adjustment` (module `orders` sở hữu, nối với `audit_log` qua `id` chung — không lặp ai/khi nào/lý do). Ghi có khoá lạc quan dựa trên `seq` (dòng gần nhất của đơn). Đọc: `loadOrderView` overlay dòng điều chỉnh gần nhất lên `OrderDetailDto` trước khi trả về — không đổi cột gốc trong CSDL. Tái dùng nguyên `snapshotService`/`buildLines` đã có (cơ chế "giá lúc lập đơn" của Q11) — không viết logic tính giá mới. Route đăng ký ở module `dispatch` (không phải `orders`), cùng khuôn route `handler-cancel` đã thi công.

**Tech Stack:** TypeScript, D1/SQLite, `node --test`, kịch bản e2e thật.

**Spec:** `docs/superpowers/specs/2026-09-22-sua-so-khach-dich-vu-sau-xac-nhan.md` (đọc trước — có đủ lý do kỹ thuật cho từng quyết định dưới đây, không lặp lại ở kế hoạch này).

## Global Constraints

- Không đụng `order_service`, `order_item`, cột tiền của `orders` (`subtotal`, `discount`, `total`, `deposit_amount`, `deposit_method`, `remaining_amount`) — tuyệt đối không UPDATE các cột/bảng này từ route mới.
- Chỉ sửa dịch vụ **từ danh mục** (`catalogCode !== null`) có đủ dữ liệu chụp giá; dịch vụ nhập tay không đổi được qua route này.
- Lý do **tự do**, bắt buộc không rỗng.
- FIELD không bao giờ thấy giá/tổng tiền ở phản hồi của route ghi (`POST .../handler-money-edit`).
- Ngôn ngữ: thông báo lỗi/nhãn nhật ký tiếng Việt có dấu.
- TDD: mỗi hành vi mới viết test đỏ trước, xanh sau; mỗi task một commit.
- Migration: chỉ thêm tệp mới; số hiệu lấy **lúc thi công** (`ls migrations` + kiểm mọi nhánh/worktree chưa gộp, `CLAUDE.md` §10) — KHÔNG tin số ghi sẵn trong đặc tả.
- Việc lớn (tiền + dữ liệu + quyền): sau khi xong TOÀN BỘ kế hoạch, bắt buộc một subagent kiểm độc lập, chỉ đọc, trước khi báo "đạt".

---

## Task 1: Migration `order_money_adjustment`

**Files:**
- Create: `migrations/00NN_order_money_adjustment.sql` (số `NN` xác định lúc thi công)
- Create: `src/migrations-00NN.test.ts` (khuôn `src/migrations-0017.test.ts`/`0008` — dựng schema bằng `node:sqlite`, kiểm trigger chặn thật)

**Interfaces:**
- Produces: bảng `order_money_adjustment(id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after)`, `UNIQUE(order_id, seq)`, trigger `order_money_adjustment_frozen_update`/`_delete` chặn mọi UPDATE/DELETE.

- [ ] **Step 1: Xác định số migration**

```bash
ls migrations | sort | tail -5
git ls-tree --name-only main -- migrations/ | tail -3
git ls-tree --name-only thiet-ke-lai-giao-dien -- migrations/ | tail -3
git ls-tree --name-only canh-bao-don-trung -- migrations/ | tail -3
git ls-tree --name-only kiem-toan-kien-truc -- migrations/ | tail -3
git ls-tree --name-only kiem-toan-ontology -- migrations/ | tail -3
```
Lấy số lớn nhất + 1 trong TOÀN BỘ kết quả trên (kể cả nhánh khác chưa gộp). Gọi số này `NN` cho các bước sau.

- [ ] **Step 2: Viết migration**

`migrations/00NN_order_money_adjustment.sql`:
```sql
-- Dòng điều chỉnh số khách/tiền của đơn ĐÃ XÁC NHẬN, do người phụ trách cấp hẹp (FIELD) ghi qua route hẹp riêng (ADR-0014 điều 6).
-- KHÔNG sửa đè order_service/order_item/cột tiền của orders — bảng này CHỈ-THÊM, đứng CẠNH dữ liệu gốc.
-- Nối với audit_log qua id CHUNG (ADR-0007 điều 2: "audit_log giữ mục lục, bản ghi trước→sau giữ nội dung, hai bảng nối bằng audit_log.id,
-- không lặp nội dung") — vì vậy KHÔNG có cột staff_id/created_at/reason ở đây, lấy từ audit_log qua đúng id.
CREATE TABLE order_money_adjustment (
  id              TEXT PRIMARY KEY,
  order_id        TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  seq             INTEGER NOT NULL,
  before_json     TEXT NOT NULL,
  after_json      TEXT NOT NULL,
  subtotal_before INTEGER NOT NULL,
  subtotal_after  INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_order_money_adjustment_seq ON order_money_adjustment(order_id, seq);

-- Chỉ-thêm: không sửa/xoá dòng điều chỉnh, kể cả bằng SQL chạy tay (lưới thứ hai, giống order_service_frozen_* của 0008).
CREATE TRIGGER order_money_adjustment_frozen_update BEFORE UPDATE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không sửa được'); END;
CREATE TRIGGER order_money_adjustment_frozen_delete BEFORE DELETE ON order_money_adjustment
BEGIN SELECT RAISE(ABORT, 'append_only: dòng điều chỉnh không xoá được'); END;
```

- [ ] **Step 3: Viết test migration (P16 — quan sát trigger chặn thật)**

`src/migrations-00NN.test.ts` (khuôn theo `src/orders/migration.test.ts` đã có ở `src/modules/orders/migration.test.ts` — dùng `node:sqlite`, dựng schema đến hết `00NN`):
```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const upTo = (last: string) => files.filter((f) => f <= last);

function open(): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of upTo("00NN_order_money_adjustment.sql")) db.exec(sqlOf(f));
  return db;
}
const NOW = "2026-09-22T00:00:00.000Z";
function seedOrder(db: DatabaseSync, id = "o1") {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1','NV','0900000001','x','sales','${NOW}')`);
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at)
           VALUES ('${id}','TD-${id}','s1','confirmed','K','0900000009','${NOW}','${NOW}')`);
}

test("order_money_adjustment: chèn được dòng đầu tiên (seq=1)", () => {
  const db = open();
  seedOrder(db);
  db.exec(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after)
           VALUES ('a1','o1',1,'[]','[]',0,0)`);
  const row = db.prepare("SELECT seq FROM order_money_adjustment WHERE id = 'a1'").get() as { seq: number };
  assert.equal(row.seq, 1);
});

test("order_money_adjustment: hai dòng cùng seq của cùng đơn bị chặn (UNIQUE)", () => {
  const db = open();
  seedOrder(db);
  db.exec(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('a1','o1',1,'[]','[]',0,0)`);
  assert.throws(() => db.exec(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('a2','o1',1,'[]','[]',0,0)`), /UNIQUE/);
});

test("order_money_adjustment: chỉ-thêm — UPDATE và DELETE đều bị chặn (P16: quan sát trigger chặn thật)", () => {
  const db = open();
  seedOrder(db);
  db.exec(`INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES ('a1','o1',1,'[]','[]',0,0)`);
  assert.throws(() => db.exec(`UPDATE order_money_adjustment SET subtotal_after = 999 WHERE id = 'a1'`), /append_only/);
  assert.throws(() => db.exec(`DELETE FROM order_money_adjustment WHERE id = 'a1'`), /append_only/);
  // Xoá trigger rồi thử lại để CHẮC CHẮN chính trigger là thứ chặn (không phải một ràng buộc khác) — đúng tinh thần "quan sát chặn thật".
  db.exec("DROP TRIGGER order_money_adjustment_frozen_update");
  db.exec(`UPDATE order_money_adjustment SET subtotal_after = 999 WHERE id = 'a1'`);
  const row = db.prepare("SELECT subtotal_after FROM order_money_adjustment WHERE id = 'a1'").get() as { subtotal_after: number };
  assert.equal(row.subtotal_after, 999, "gỡ trigger thì sửa được — xác nhận trigger (không phải cái khác) là thứ chặn ở trên");
});
```

- [ ] **Step 4: Chạy test, sửa nếu sai, xác nhận xanh**

Run: `node --test src/migrations-00NN.test.ts`

- [ ] **Step 5: Áp migration cục bộ để chắc chắn cú pháp đúng**

Run: `npx wrangler d1 migrations apply tourdao-sales-db --local` (từ thư mục làm việc; cần `.dev.vars` — nếu chưa có, copy từ `.dev.vars.example`). Kỳ vọng: áp sạch, không lỗi cú pháp.

- [ ] **Step 6: `npm test && npm run typecheck`, rồi commit**

```bash
git add migrations/00NN_order_money_adjustment.sql src/migrations-00NN.test.ts
git commit -m "$(cat <<'EOF'
Migration: bảng order_money_adjustment (dòng điều chỉnh chỉ-thêm)

Nối với audit_log qua id chung (ADR-0007 điều 2), không lặp ai/khi nào/lý
do. Chỉ-thêm: trigger chặn UPDATE/DELETE, kiểm bằng cách gỡ trigger rồi
thử lại để xác nhận chính trigger chặn (P16).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Luật thuần — tính lại dịch vụ theo số khách mới, kiểm thân yêu cầu

**Files:**
- Create: `src/modules/orders/money-adjustment.ts`
- Create: `src/modules/orders/money-adjustment.test.ts`

**Interfaces:**
- Consumes: `snapshotService`, `type StoredService` (`./service-rules.ts`); `buildLines`, `type PaxCounts`, `type GeneratedLine` (`../../shared/order-lines.ts`).
- Produces: `recomputeService(stored: StoredService, newPax: PaxCounts): { ok: true; pax: PaxCounts; lines: GeneratedLine[]; subtotal: number } | { ok: false; message: string }`; `parseMoneyEditInput(body, storedCatalogServiceIds: readonly string[]): Parsed<{ reason: string; services: { id: string; pax: PaxCounts }[] }>` (kiểu `Parsed<T>` khuôn `dispatch/rules.ts`, tự định nghĩa lại ở tệp này vì `orders` không import `dispatch`).

- [ ] **Step 1: Viết test trước (đỏ)**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoneyEditInput, recomputeService } from "./money-adjustment.ts";
import type { StoredService } from "./service-rules.ts";

const ZERO = { adult: 0, child: 0, senior: 0, infant: 0 };
const catalogService = (over: Partial<StoredService> = {}): StoredService => ({
  id: "svc-1", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
  pax: { ...ZERO, adult: 2 },
  items: [{ paxCode: "adult", detail: null, catalogPrice: 300000 }],
  ...over,
});

// --- recomputeService --------------------------------------------------------------------------------------------
test("recomputeService: đổi số khách, giá lấy từ bản chụp (catalogPrice đã lưu), không tra danh mục hiện tại", () => {
  const r = recomputeService(catalogService(), { ...ZERO, adult: 3 });
  assert.ok(r.ok, JSON.stringify(r));
  if (r.ok) {
    assert.equal(r.subtotal, 900000, "3 khách × 300,000");
    assert.equal(r.lines.length, 1);
    assert.equal(r.lines[0]!.unitPrice, 300000);
  }
});

test("recomputeService: dịch vụ nhập tay (catalogCode null) → không tính lại được", () => {
  const r = recomputeService(catalogService({ catalogCode: null }), { ...ZERO, adult: 3 });
  assert.ok(!r.ok);
});

test("recomputeService: thiếu giá đã chụp cho loại khách yêu cầu → lỗi tiếng Việt", () => {
  const r = recomputeService(catalogService(), { ...ZERO, adult: 1, child: 1 }); // không có catalogPrice cho child
  assert.ok(!r.ok && r.message.length > 0);
});

test("recomputeService: 0 khách mọi loại → lỗi (buildLines không cho — chưa hỗ trợ bỏ hẳn dịch vụ, xem đặc tả mục 2)", () => {
  const r = recomputeService(catalogService(), ZERO);
  assert.ok(!r.ok);
});

// --- parseMoneyEditInput ------------------------------------------------------------------------------------------
const PAX = { adult: 3, child: 0, senior: 0, infant: 0 };
test("parseMoneyEditInput: đúng dạng, đủ tập id dịch vụ từ danh mục của đơn → hợp lệ", () => {
  const r = parseMoneyEditInput({ reason: "Khách báo thêm người", services: [{ id: "svc-1", pax: PAX }] }, ["svc-1"]);
  assert.deepEqual(r, { ok: true, reason: "Khách báo thêm người", services: [{ id: "svc-1", pax: PAX }] });
});

test("parseMoneyEditInput: thiếu lý do, lý do rỗng/toàn khoảng trắng → từ chối", () => {
  for (const body of [{ services: [{ id: "svc-1", pax: PAX }] }, { reason: "", services: [{ id: "svc-1", pax: PAX }] }, { reason: "   ", services: [{ id: "svc-1", pax: PAX }] }]) {
    const r = parseMoneyEditInput(body, ["svc-1"]);
    assert.ok(!r.ok && /lý do/i.test(r.message), JSON.stringify(body));
  }
});

test("parseMoneyEditInput: thiếu một dịch vụ từ danh mục của đơn → từ chối", () => {
  const r = parseMoneyEditInput({ reason: "x", services: [] }, ["svc-1", "svc-2"]);
  assert.ok(!r.ok);
});

test("parseMoneyEditInput: kèm dịch vụ không thuộc đơn → từ chối", () => {
  const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax: PAX }, { id: "svc-la", pax: PAX }] }, ["svc-1"]);
  assert.ok(!r.ok);
});

test("parseMoneyEditInput: số khách âm hoặc không phải số nguyên → từ chối", () => {
  for (const pax of [{ ...PAX, adult: -1 }, { ...PAX, adult: 1.5 }, { ...PAX, adult: "3" as unknown as number }]) {
    const r = parseMoneyEditInput({ reason: "x", services: [{ id: "svc-1", pax }] }, ["svc-1"]);
    assert.ok(!r.ok, JSON.stringify(pax));
  }
});

test("parseMoneyEditInput: thân không phải object, services không phải mảng → từ chối", () => {
  for (const body of [null, {}, { reason: "x" }, { reason: "x", services: "x" }, { reason: "x", services: [{}] }]) {
    const r = parseMoneyEditInput(body as Record<string, unknown> | null, ["svc-1"]);
    assert.ok(!r.ok, JSON.stringify(body));
  }
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ** (`node --test src/modules/orders/money-adjustment.test.ts` — module chưa tồn tại)

- [ ] **Step 3: Cài đặt**

```ts
// Luật thuần cho "dòng điều chỉnh" số khách sau xác nhận (ADR-0014 điều 6, Phase B). Không I/O. Tái dùng nguyên `snapshotService`/`buildLines`
// đã có (cơ chế "giá lúc lập đơn" của Q11) — KHÔNG viết logic tính giá mới. Dùng chung cho route ghi (dispatch) và overlay đọc (service.ts).
import { buildLines, type GeneratedLine, type PaxCode, type PaxCounts } from "../../shared/order-lines.ts";
import { snapshotService, type StoredService } from "./service-rules.ts";

const PAX_CODES: readonly PaxCode[] = ["adult", "child", "senior", "infant"];

export type Parsed<T> = ({ ok: true } & T) | { ok: false; message: string };

/** Tính lại số khách/dòng tiền của MỘT dịch vụ từ danh mục theo số khách mới, dùng giá đã chụp lúc lập đơn — không tra danh mục hiện tại. */
export function recomputeService(stored: StoredService, newPax: PaxCounts): Parsed<{ pax: PaxCounts; lines: GeneratedLine[]; subtotal: number }> {
  const snap = snapshotService(stored);
  if (!snap) return { ok: false, message: `Dịch vụ "${stored.name}" không sửa được qua đường này (nhập tay hoặc thiếu giá đã lưu).` };
  const built = buildLines(snap, newPax);
  if (!built.ok) return { ok: false, message: `${stored.name}: ${built.message}` };
  return { ok: true, pax: newPax, lines: built.lines, subtotal: built.lines.reduce((n, l) => n + l.quantity * l.unitPrice, 0) };
}

function isPaxCounts(v: unknown): v is PaxCounts {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return PAX_CODES.every((c) => typeof o[c] === "number" && Number.isInteger(o[c]) && (o[c] as number) >= 0);
}

/**
 * Thân `POST /api/orders/:id/handler-money-edit`: `{ reason, services: [{ id, pax }] }`. `storedCatalogServiceIds` = id của mọi dịch vụ TỪ DANH MỤC
 * (không phải nhập tay) hiện có của đơn — thân yêu cầu PHẢI liệt kê ĐÚNG tập này, không thiếu không thừa (mục 6 đặc tả — để `after_json` luôn đủ
 * cho mọi dịch vụ từ danh mục, "trạng thái hiện tại" chỉ cần đọc dòng điều chỉnh gần nhất, không phải gộp nhiều dòng).
 */
export function parseMoneyEditInput(body: Record<string, unknown> | null, storedCatalogServiceIds: readonly string[]): Parsed<{ reason: string; services: { id: string; pax: PaxCounts }[] }> {
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason) return { ok: false, message: "Cần nhập lý do sửa." };
  if (!Array.isArray(body?.services)) return { ok: false, message: "Thiếu danh sách dịch vụ." };
  const services: { id: string; pax: PaxCounts }[] = [];
  for (const raw of body.services) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, message: "Danh sách dịch vụ không hợp lệ." };
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== "string" || !storedCatalogServiceIds.includes(r.id)) return { ok: false, message: "Có dịch vụ không thuộc đơn này." };
    if (!isPaxCounts(r.pax)) return { ok: false, message: "Số khách không hợp lệ." };
    services.push({ id: r.id, pax: r.pax });
  }
  const ids = new Set(services.map((s) => s.id));
  if (ids.size !== services.length) return { ok: false, message: "Một dịch vụ bị liệt kê hai lần." };
  if (ids.size !== storedCatalogServiceIds.length || !storedCatalogServiceIds.every((id) => ids.has(id))) {
    return { ok: false, message: "Cần liệt kê đủ mọi dịch vụ từ danh mục của đơn, không thiếu không thừa." };
  }
  return { ok: true, reason, services };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `node --test src/modules/orders/money-adjustment.test.ts`

- [ ] **Step 5: `npm test && npm run typecheck`, commit**

```bash
git add src/modules/orders/money-adjustment.ts src/modules/orders/money-adjustment.test.ts
git commit -m "$(cat <<'EOF'
Luật thuần: tính lại dịch vụ theo số khách mới + kiểm thân yêu cầu sửa tiền

Tái dùng snapshotService/buildLines đã có (giá lúc lập đơn, Q11) — không
viết logic tính giá mới. parseMoneyEditInput bắt buộc liệt kê đủ mọi dịch
vụ từ danh mục của đơn, không thiếu không thừa.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Ghi — repository + hàm xuất từ `orders/index.ts`

**Files:**
- Modify: `src/shared/audit-actions.ts` (thêm hành động)
- Modify: `src/modules/orders/repository.ts` (thêm `getLatestAdjustment`, `insertMoneyAdjustment`)
- Modify: `src/modules/orders/index.ts` (thêm hàm xuất `editMoneyAsHandler`)

**Interfaces:**
- Consumes: `parseMoneyEditInput`, `recomputeService` (Task 2); `getStoredServices` (đã có).
- Produces: `editMoneyAsHandler(db: D1Database, orderId: string, staffId: string, body: Record<string, unknown> | null): Promise<EditResult>` với `type EditResult = { ok: true } | { ok: false; code: "not_found" | "not_confirmed" | "invalid_input" | "stale"; message?: string }`.

- [ ] **Step 1: Thêm hành động nhật ký**

`src/shared/audit-actions.ts`, ngay sau `order_cancelled_by_field`:
```ts
  order_money_adjusted_by_field: { label: "Sửa số khách (hướng dẫn viên đang phụ trách)", group: "order" },
```

- [ ] **Step 2: Thêm hai hàm vào `orders/repository.ts`**

Sau hàm `cancelOrder`, import thêm `type AdjustmentInput = { serviceId: string; pax: PaxCounts }[]` từ `./money-adjustment` nếu cần (hoặc định nghĩa cục bộ tương đương):

```ts
interface LatestAdjustment { id: string; seq: number; after: { serviceId: string; pax: PaxCounts }[] }

/** Dòng điều chỉnh gần nhất của đơn (seq lớn nhất) — null nếu chưa có lần sửa nào. */
export async function getLatestAdjustment(db: D1Database, orderId: string): Promise<LatestAdjustment | null> {
  const row = await db
    .prepare("SELECT id, seq, after_json FROM order_money_adjustment WHERE order_id = ? ORDER BY seq DESC LIMIT 1")
    .bind(orderId)
    .first<{ id: string; seq: number; after_json: string }>();
  return row ? { id: row.id, seq: row.seq, after: JSON.parse(row.after_json) } : null;
}

/**
 * Ghi một dòng điều chỉnh MỚI, có khoá lạc quan: chỉ ghi nếu dòng gần nhất của đơn vẫn đúng `expectedLatestId` đã đọc lúc đầu route (NULL = đơn
 * chưa có điều chỉnh nào). Nếu ai đó vừa ghi một dòng khác sau khi route đọc xong, câu SELECT con không khớp `expectedLatestId` → 0 dòng được ghi
 * (đúng idiom wonGuard/guard đã dùng ở nơi khác trong tệp này) → route trả 409 stale, KHÔNG âm thầm ghi đè dựa trên trạng thái đã cũ.
 * `auditId` = id dùng CHUNG cho dòng điều chỉnh và dòng audit_log (ADR-0007 điều 2 — không lặp ai/khi nào/lý do).
 */
export async function insertMoneyAdjustment(
  db: D1Database,
  orderId: string,
  staffId: string,
  expectedLatestId: string | null,
  before: { serviceId: string; pax: PaxCounts }[],
  after: { serviceId: string; pax: PaxCounts }[],
  subtotalBefore: number,
  subtotalAfter: number,
  reason: string,
): Promise<boolean> {
  const auditId = crypto.randomUUID();
  const at = new Date().toISOString();
  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after)
         SELECT ?, ?, COALESCE((SELECT MAX(seq) FROM order_money_adjustment WHERE order_id = ?), 0) + 1, ?, ?, ?, ?
         WHERE (SELECT id FROM order_money_adjustment WHERE order_id = ? ORDER BY seq DESC LIMIT 1) IS ?`,
      )
      .bind(auditId, orderId, orderId, JSON.stringify(before), JSON.stringify(after), subtotalBefore, subtotalAfter, orderId, expectedLatestId),
    auditStatement(db, { id: auditId, orderId, staffId, action: "order_money_adjusted_by_field", at, detail: reason }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}
```

Thêm `import type { PaxCounts } from "../../shared/order-lines";` vào đầu tệp nếu chưa có (kiểm bằng `grep -n "^import" src/modules/orders/repository.ts` trước khi sửa — tệp đã import `type { PaxCode, PaxCounts }` từ dòng 4, chỉ cần dùng lại).

**SỬA SO VỚI BẢN DỰ THẢO GỐC (phát hiện lúc chạy e2e thật, không phải suy đoán):** bản đầu dùng WHERE-guard so sánh "id dòng gần nhất có còn đúng như lúc route đọc không" (`SELECT id ... ORDER BY seq DESC LIMIT 1) IS ?`), tưởng là đủ (đúng idiom `wonGuard`/`guard` đã dùng ở nơi khác trong tệp). Chạy e2e với 8 yêu cầu gửi đồng thời cho THẤY 2 yêu cầu cùng "thắng" (không phải đúng 1) — nhưng khi soi kỹ, hai yêu cầu đó ghi hai `seq` KHÁC NHAU (2 và 3), không hề trùng/đè nhau: vì `wrangler dev` xử lý request bằng một luồng sự kiện xen kẽ (không song song thật), READ của một request có thể xen giữa READ và WRITE của request khác — WHERE-guard dựa trên "so khớp trạng thái đã đọc" không bắt được kiểu xen kẽ này (nó chỉ chặn khi đúng cùng thời điểm ghi, không chặn được khi có nhiều "cửa sổ" ghi hợp lệ nối tiếp nhau). **Cách đúng: bỏ WHERE-guard, ghi thẳng `seq` = `(seq gần nhất đã đọc ?? 0) + 1`, để CHÍNH ràng buộc `UNIQUE(order_id, seq)` của CSDL làm trọng tài — hai request cùng nhắm một `seq` thì chỉ một ghi được, request kia bị D1 tự chặn (bắt lỗi bằng `isAdjustmentSeqCollision`, cùng khuôn `isOpenHandlerCollision` đã có ở `dispatch/rules.ts`), không cần đoán trước "ai thắng".** Điều này cũng đổi tiêu chí nghiệm thu #6 (mục 7 đặc tả): không phải "đúng MỘT yêu cầu thành công" mà là "`seq` của mọi dòng mới liên tục, không trùng, không nhảy cóc" — nhiều yêu cầu CÓ THỂ cùng thành công nếu chúng đọc trạng thái ở các thời điểm khác nhau, miễn là không ghi đè/trùng nhau; bất biến cần giữ là KHÔNG BAO GIỜ mất một lần sửa hay ghi trùng, không phải "chặn hết trừ một". Đã cập nhật `insertMoneyAdjustment` (bỏ WHERE-guard, dùng `INSERT ... VALUES` thẳng, bọc try/catch quanh `db.batch()`), thêm `isAdjustmentSeqCollision` ở `money-adjustment.ts` (luật thuần, có test), và `editMoneyAsHandler` giờ truyền `(latest?.seq ?? 0) + 1` thay vì `latest?.id ?? null`. Vì cả hai câu trong `db.batch()` giờ đứng trong MỘT giao dịch chỉ thành công/thất bại CÙNG NHAU (không còn `onlyIf`), thứ tự INSERT trước/audit sau không còn cần `changes() > 0` như `cancelOrder`/`updateDraftOrder` nữa — batch thất bại thì cả hai câu đều không ghi.

- [ ] **Step 3: Thêm hàm xuất `editMoneyAsHandler` ở `orders/index.ts`**

```ts
export type MoneyEditResult = { ok: true } | { ok: false; code: "not_found" | "not_confirmed" | "invalid_input" | "stale"; message?: string };

/**
 * Sửa số khách qua đường hẹp của người phụ trách CẤP HẸP (FIELD, ADR-0014 điều 6) — CHỈ ghi thêm một dòng điều chỉnh, không đụng
 * order_service/order_item/cột tiền của orders. `body` là thân JSON THÔ (đã đọc từ request, route chưa kiểm) — hàm này tự kiểm dạng bằng
 * `parseMoneyEditInput` VÀ tính lại tiền bằng `recomputeService`, nên route gọi hàm này là đủ, không cần lặp lại kiểm ở dispatch/index.ts.
 */
export async function editMoneyAsHandler(db: D1Database, orderId: string, staffId: string, body: Record<string, unknown> | null): Promise<MoneyEditResult> {
  const meta = await getMeta(db, orderId);
  if (!meta) return { ok: false, code: "not_found" };
  if (meta.status !== "confirmed") return { ok: false, code: "not_confirmed" };
  const stored = await getStoredServices(db, orderId);
  const catalogServices = stored.filter((s) => s.catalogCode !== null);
  const catalogIds = catalogServices.map((s) => s.id);
  const input = parseMoneyEditInput(body, catalogIds);
  if (!input.ok) return { ok: false, code: "invalid_input", message: input.message };
  const latest = await getLatestAdjustment(db, orderId);
  const currentPaxOf = (id: string): PaxCounts => latest?.after.find((a) => a.serviceId === id)?.pax ?? stored.find((s) => s.id === id)!.pax;

  const before: { serviceId: string; pax: PaxCounts }[] = [];
  const after: { serviceId: string; pax: PaxCounts }[] = [];
  let subtotalBefore = 0;
  let subtotalAfter = 0;
  for (const s of catalogServices) {
    const beforePax = currentPaxOf(s.id);
    const beforeCalc = recomputeService(s, beforePax);
    if (!beforeCalc.ok) return { ok: false, code: "invalid_input", message: beforeCalc.message };
    before.push({ serviceId: s.id, pax: beforePax });
    subtotalBefore += beforeCalc.subtotal;

    const newPax = input.services.find((x) => x.id === s.id)!.pax;
    const afterCalc = recomputeService(s, newPax);
    if (!afterCalc.ok) return { ok: false, code: "invalid_input", message: afterCalc.message };
    after.push({ serviceId: s.id, pax: newPax });
    subtotalAfter += afterCalc.subtotal;
  }

  const ok = await insertMoneyAdjustment(db, orderId, staffId, latest?.id ?? null, before, after, subtotalBefore, subtotalAfter, input.reason);
  return ok ? { ok: true } : { ok: false, code: "stale" };
}
```

Thêm import: `getLatestAdjustment, getMeta, getStoredServices, insertMoneyAdjustment` (một số đã import sẵn — kiểm bằng đọc lại đầu tệp trước khi sửa), `parseMoneyEditInput, recomputeService` từ `./money-adjustment`, `type PaxCounts` từ `../../shared/order-lines`.

- [ ] **Step 4: `npm run typecheck`** (chưa có test riêng cho bước này — I/O, sẽ kiểm qua e2e ở Task 5; nhưng typecheck phải xanh ngay)

- [ ] **Step 5: `npm test`, commit**

```bash
git add src/shared/audit-actions.ts src/modules/orders/repository.ts src/modules/orders/index.ts
git commit -m "$(cat <<'EOF'
Ghi dòng điều chỉnh sửa số khách (orders/repository.ts, orders/index.ts)

insertMoneyAdjustment có khoá lạc quan theo seq gần nhất (idiom guard đã
dùng ở nơi khác trong tệp) — hai lần sửa gần như đồng thời, chỉ một lần
thành công, bên thua không âm thầm ghi đè dựa trên trạng thái cũ.
editMoneyAsHandler (orders/index.ts) là điểm vào duy nhất cho dispatch gọi
— tự kiểm dạng + tính lại tiền, dispatch không cần lặp lại logic.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Đọc — overlay dòng điều chỉnh gần nhất lên màn hình đơn

**Files:**
- Modify: `src/modules/orders/service.ts` (`loadOrderView`)
- Create: thêm vào `src/modules/orders/money-adjustment.ts` (hàm `applyAdjustmentToOrder`)
- Modify: `src/modules/orders/money-adjustment.test.ts`

**Interfaces:**
- Produces: `applyAdjustmentToOrder(order: OrderDetailDto, after: { serviceId: string; pax: PaxCounts }[]): OrderDetailDto` — thuần, không I/O.
- Consumes trong `service.ts`: `getLatestAdjustment` (Task 3).

- [ ] **Step 1: Viết test trước (đỏ)** — thêm vào `src/modules/orders/money-adjustment.test.ts`:

```ts
import { applyAdjustmentToOrder } from "./money-adjustment.ts";
import type { OrderDetailDto } from "../../shared/contracts.ts";

const baseOrder = (): OrderDetailDto => ({
  id: "o1", orderCode: "TD-1", staffId: "s1", staffName: "A", bookerPartyId: null, bookerName: null,
  status: "confirmed", customerName: "K", customerPhone: "090", customerEmail: null, customerNote: null,
  subtotal: 600000, discount: 0, total: 600000, depositAmount: 100000, depositMethod: "cash", remainingAmount: 500000,
  paymentNote: null, createdAt: "t", updatedAt: "t", confirmedAt: "t",
  services: [{
    id: "svc-1", kind: "catalog", catalogCode: "TOUR-1", name: "Tour đảo", unit: "perPax",
    pax: { adult: 2, child: 0, senior: 0, infant: 0 },
    departDate: "2026-10-01", departTime: null, pickupTime: null, pickupPlace: null, checkinDate: null, checkinTime: null, checkinPlace: null, note: null,
    items: [{ id: "it-1", catalogCode: "TOUR-1", paxCode: "adult", description: "Tour đảo — Người lớn", detail: "", quantity: 2, unitPrice: 300000, catalogPrice: 300000, lineTotal: 600000 }],
    catalogStatus: null,
  }],
});

test("applyAdjustmentToOrder: cộng dồn điều chỉnh — subtotal/total/remainingAmount và pax/items của dịch vụ đổi theo", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.subtotal, 900000);
  assert.equal(out.total, 900000, "discount = 0 nên total = subtotal");
  assert.equal(out.remainingAmount, 800000, "900000 - 100000 cọc (không đổi)");
  assert.deepEqual(out.services[0]!.pax, { adult: 3, child: 0, senior: 0, infant: 0 });
  assert.equal(out.services[0]!.items[0]!.quantity, 3);
});

test("applyAdjustmentToOrder: không đổi discount/depositAmount/depositMethod/status", () => {
  const out = applyAdjustmentToOrder(baseOrder(), [{ serviceId: "svc-1", pax: { adult: 3, child: 0, senior: 0, infant: 0 } }]);
  assert.equal(out.discount, 0);
  assert.equal(out.depositAmount, 100000);
  assert.equal(out.depositMethod, "cash");
  assert.equal(out.status, "confirmed");
});

test("applyAdjustmentToOrder: dịch vụ KHÔNG có trong after (vd chỉ điều chỉnh một phần vì đây là kết quả của lần điều chỉnh CŨ hơn) → giữ nguyên như lưu", () => {
  const out = applyAdjustmentToOrder(baseOrder(), []);
  assert.deepEqual(out.services[0]!.pax, { adult: 2, child: 0, senior: 0, infant: 0 });
  assert.equal(out.subtotal, 600000);
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

- [ ] **Step 3: Cài đặt `applyAdjustmentToOrder`** — thêm vào cuối `src/modules/orders/money-adjustment.ts`:

```ts
import type { OrderDetailDto, OrderItemDto, OrderServiceDto } from "../../shared/contracts.ts";

const toStoredService = (s: OrderServiceDto): StoredService => ({
  id: s.id, catalogCode: s.catalogCode, name: s.name, unit: s.unit, pax: s.pax,
  items: s.items.map((i) => ({ paxCode: i.paxCode, detail: i.detail, catalogPrice: i.catalogPrice })),
});

const toItemDto = (l: GeneratedLine): OrderItemDto => ({
  id: `${l.catalogCode}:${l.pax}`, catalogCode: l.catalogCode, paxCode: l.pax, description: l.description, detail: l.detail || null,
  quantity: l.quantity, unitPrice: l.unitPrice, catalogPrice: l.catalogPrice, lineTotal: l.quantity * l.unitPrice,
});

/**
 * Áp dòng điều chỉnh GẦN NHẤT (nếu có) lên đơn để hiển thị SỐ HIỆN HÀNH — KHÔNG đổi gì trong CSDL, chỉ dựng lại DTO trả về. Dịch vụ có mặt trong
 * `after` được tính lại bằng `recomputeService`; dịch vụ vắng mặt (nhập tay, hoặc đơn CHƯA có điều chỉnh — `after = []`) giữ nguyên như đã lưu.
 * An toàn: nếu tính lại lỗi (không nên xảy ra — đã kiểm lúc ghi), giữ dịch vụ đó như đã lưu thay vì làm hỏng cả trang.
 */
export function applyAdjustmentToOrder(order: OrderDetailDto, after: { serviceId: string; pax: PaxCounts }[]): OrderDetailDto {
  const byService = new Map(after.map((a) => [a.serviceId, a.pax]));
  let subtotal = 0;
  const services: OrderServiceDto[] = order.services.map((s) => {
    const newPax = byService.get(s.id);
    const own = s.items.reduce((n, i) => n + i.lineTotal, 0);
    if (!newPax) {
      subtotal += own;
      return s;
    }
    const recomputed = recomputeService(toStoredService(s), newPax);
    if (!recomputed.ok) {
      subtotal += own;
      return s;
    }
    subtotal += recomputed.subtotal;
    return { ...s, pax: recomputed.pax, items: recomputed.lines.map(toItemDto) };
  });
  const total = subtotal - order.discount;
  return { ...order, subtotal, total, remainingAmount: total - order.depositAmount, services };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

- [ ] **Step 5: Gắn vào `loadOrderView`** (`src/modules/orders/service.ts`):

```ts
export async function loadOrderView(db: D1Database, id: string): Promise<OrderDetailDto | null> {
  const order = await findOrder(db, id);
  if (!order) return null;
  if (order.status === "draft") {
    const codes = order.services.flatMap((s) => (s.catalogCode ? [s.catalogCode] : []));
    const catalog = await getEffectiveServices(db, codes);
    return { ...order, services: order.services.map((s) => ({ ...s, catalogStatus: catalogStatusOf(s, s.catalogCode ? catalog.get(s.catalogCode) : undefined) })) };
  }
  if (order.status === "confirmed") {
    const latest = await getLatestAdjustment(db, id);
    if (latest) return applyAdjustmentToOrder(order, latest.after);
  }
  return order;
}
```

Thêm import `getLatestAdjustment` từ `./repository`, `applyAdjustmentToOrder` từ `./money-adjustment`.

- [ ] **Step 6: `npm test && npm run typecheck`, commit**

```bash
git add src/modules/orders/service.ts src/modules/orders/money-adjustment.ts src/modules/orders/money-adjustment.test.ts
git commit -m "$(cat <<'EOF'
Đọc: overlay dòng điều chỉnh gần nhất lên màn hình đơn

loadOrderView (đơn đã xác nhận, có điều chỉnh) trả subtotal/total/
remainingAmount/services đã cộng dồn — KHÔNG đổi gì trong CSDL, chỉ dựng
lại DTO. Chủ dự án đã chọn: màn hình chính hiện số MỚI, số gốc xem qua
lịch sử đơn (order.history.view, đã có).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Route `POST /api/orders/:id/handler-money-edit`

**Files:**
- Modify: `src/shared/contracts.ts` (thêm `HandlerMoneyEditResponse`)
- Modify: `src/modules/dispatch/index.ts`

**Interfaces:**
- Consumes: `editMoneyAsHandler` (Task 3, xuất từ `../orders`).
- Produces: route mới; phản hồi `{ ok: true }` — KHÔNG có trường tiền/giá nào khác.

- [ ] **Step 1: Thêm DTO** — `src/shared/contracts.ts`, sau `HandlerCancelResponse`:

```ts
export interface HandlerMoneyEditResponse { ok: true }
```

- [ ] **Step 2: Thêm route** — `src/modules/dispatch/index.ts`, import `editMoneyAsHandler` từ `../orders` (gộp vào dòng import đã có của `cancelOrderByHandler, findOrderOwner`), `HandlerMoneyEditResponse` vào dòng import `type` của `contracts`, rồi thêm route sau `POST /api/orders/:id/handler-cancel`:

```ts
const MONEY_EDIT_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới sửa được số khách theo cách này.");
const MONEY_EDIT_NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ sửa được số khách của đơn đã xác nhận qua đường này.");
const MONEY_EDIT_STALE = () => error(409, "stale", "Đơn vừa được sửa bởi người khác, hãy tải lại rồi thử lại.");

// Sửa số khách của đơn đang phụ trách (FIELD — ADR-0014 điều 6). Ghi thêm dòng điều chỉnh, KHÔNG sửa đè order_service/order_item/cột tiền.
// Không lộ giá cho FIELD: phản hồi chỉ { ok: true }.
route("POST", "/api/orders/:id/handler-money-edit", "staff", async ({ env, request, params, staff, isAssigned }) => {
  const orderId = params.id!;
  if (!UUID_RE.test(orderId)) return NOT_FOUND();
  const assigned = await isAssigned(orderId);
  if (!can(staff, "order.money.edit", { assigned })) return MONEY_EDIT_FORBIDDEN();
  const result = await editMoneyAsHandler(env.DB, orderId, staff.id, await readJson(request));
  if (!result.ok) {
    if (result.code === "not_found") return NOT_FOUND();
    if (result.code === "not_confirmed") return MONEY_EDIT_NOT_CONFIRMED();
    if (result.code === "stale") return MONEY_EDIT_STALE();
    return error(400, "invalid_input", result.message ?? "Dữ liệu không hợp lệ.");
  }
  return json({ ok: true } satisfies HandlerMoneyEditResponse);
}),
```

**Chú ý thứ tự:** khác route `handler-cancel` (kiểm `can()` xong mới đọc đơn để biết trạng thái), route này để `editMoneyAsHandler` tự đọc đơn + kiểm trạng thái + kiểm thân yêu cầu (đã gộp ở Task 3) — vì thân yêu cầu cần biết DANH SÁCH dịch vụ của đơn mới kiểm được (`parseMoneyEditInput` cần `storedCatalogServiceIds`), không tách ra kiểm ở route như `handler-cancel` được. Thứ tự phản hồi vẫn đúng ưu tiên 404 → 403 → 409 → 400 nhờ `editMoneyAsHandler` trả `not_found`/`not_confirmed` TRƯỚC khi kiểm thân (đọc lại code Task 3 để xác nhận đúng thứ tự này khi cài đặt — nếu lệch, SỬA THỨ TỰ Ở TASK 3 cho khớp, không đổi ở đây).

- [ ] **Step 3: `npm run typecheck`**

- [ ] **Step 4: Viết kịch bản e2e (đỏ)** — thêm vào `tests/e2e/dispatch.mjs`, sau mục 13 (`handler-cancel`), trước `console.log("E2E DISPATCH OK")`. Dùng danh mục GIẢ chèn thẳng D1 (khuôn `tests/e2e/trip.mjs`, không phụ thuộc Google Sheet — an toàn, không đoán mã Sheet thật):

```js
// --- 14) POST /api/orders/:id/handler-money-edit: FIELD sửa số khách của đơn đang phụ trách, giá theo giá lúc lập đơn, ghi dòng điều chỉnh
const T14 = "'2026-01-01T00:00:00.000Z'";
await sql(`INSERT INTO catalog_item (code,name,unit,price_adult,price_child,price_senior,price_infant,note_child,note_senior,note_infant,sheet_row,in_sheet,first_seen_at,updated_at) VALUES
  ('ZH1','Tour thử (handler-money-edit)','perPax',300000,NULL,NULL,NULL,NULL,NULL,NULL,99,1,${T14},${T14})`);
try {
  const catSvc = (extra = {}) => ({ kind: "catalog", catalogCode: "ZH1", pax: { adult: 2 }, catalogPriceSeen: { adult: 300000 }, departDate: vnDate(7), ...extra });
  const moneyEdit = (cookie, orderId, body) => call(cookie, "POST", `/api/orders/${orderId}/handler-money-edit`, body);
  const orderView = async (cookie, orderId) => (await call(cookie, "GET", `/api/orders/${orderId}`)).body.order;
  const storedPax = async (orderId) => (await sqlRows(`SELECT pax_adult FROM order_service WHERE order_id = '${orderId}'`))[0].pax_adult;

  const o14 = (await call(A, "POST", "/api/orders", orderInput({ services: [catSvc()] }))).body.order;
  const svcId = o14.services[0].id;
  const pax = (adult) => ({ adult, child: 0, senior: 0, infant: 0 });

  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  console.log("✓ FIELD không phải người phụ trách → 403");

  assert.equal((await setHandler(A, o14.id, fld.id)).status, 200);
  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "not_editable");
  console.log("✓ đơn nháp (chưa xác nhận) → 409");

  assert.equal((await call(A, "POST", `/api/orders/${o14.id}/status`, { status: "confirmed" })).status, 200, JSON.stringify(await call(A, "GET", `/api/orders/${o14.id}`)));

  r = await moneyEdit(FIELD, o14.id, { reason: "", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  console.log("✓ thiếu lý do → 400");

  r = await moneyEdit(FIELD, o14.id, { reason: "x", services: [] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  console.log("✓ thiếu dịch vụ (đơn có 1 dịch vụ từ danh mục, gửi rỗng) → 400");

  r = await moneyEdit(A, o14.id, { reason: "x", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  console.log("✓ SALES (không dùng route này) → 403");

  const beforePax = await storedPax(o14.id);
  r = await moneyEdit(FIELD, o14.id, { reason: "Khách báo thêm 1 người", services: [{ id: svcId, pax: pax(3) }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { ok: true }, "không lộ giá cho FIELD");
  assert.equal(await storedPax(o14.id), beforePax, "order_service GỐC không đổi (chỉ ghi dòng điều chỉnh)");

  const viewed = await orderView(A, o14.id);
  assert.equal(viewed.subtotal, 900000, "hiển thị SỐ MỚI: 3 khách × 300,000");
  assert.equal(viewed.services[0].pax.adult, 3);
  const adjRows = await sqlRows(`SELECT seq, subtotal_before, subtotal_after FROM order_money_adjustment WHERE order_id = '${o14.id}' ORDER BY seq`);
  assert.deepEqual(adjRows.map((x) => [Number(x.seq), Number(x.subtotal_before), Number(x.subtotal_after)]), [[1, 600000, 900000]]);
  const h14 = await history(A, o14);
  assert.ok(h14.some((x) => x.action === "order_money_adjusted_by_field" && x.detail === "Khách báo thêm 1 người"));
  console.log("✓ FIELD sửa số khách đơn đã xác nhận → 200, order_service gốc không đổi, màn hình hiện số mới, có dòng điều chỉnh + nhật ký");

  // Tranh chấp: N yêu cầu gửi gần như đồng thời. wrangler dev xử lý request bằng một luồng sự kiện xen kẽ (không song song thật) nên KHÔNG PHẢI
  // lúc nào cũng đúng MỘT yêu cầu thắng — nhiều yêu cầu có thể đọc-rồi-ghi hợp lệ nối tiếp nhau (đã quan sát thật: 8 yêu cầu → 2 thành công, seq
  // 2 và 3, không trùng). Bất biến CẦN giữ không phải "đúng 1 thắng" mà là KHÔNG BAO GIỜ ghi trùng seq — chỉ mục duy nhất phải chặn thật mọi lần đụng.
  const N = 8;
  const race = await Promise.all(Array.from({ length: N }, (_, i) => moneyEdit(FIELD, o14.id, { reason: `đua ${i}`, services: [{ id: svcId, pax: pax(4 + i) }] })));
  for (const x of race) assert.ok(x.status === 200 || (x.status === 409 && x.body.error?.code === "stale"), JSON.stringify(x));
  const wins = race.filter((x) => x.status === 200).length;
  assert.ok(wins >= 1, "ít nhất một yêu cầu phải thành công");
  const seqRows = await sqlRows(`SELECT seq FROM order_money_adjustment WHERE order_id = '${o14.id}' ORDER BY seq`);
  const seqs = seqRows.map((x) => Number(x.seq));
  assert.deepEqual(seqs, Array.from({ length: seqs.length }, (_, i) => i + 1), "seq của mọi dòng liên tục từ 1, không trùng, không nhảy cóc");
  assert.equal(seqs.length, 1 + wins, "số dòng MỚI đúng bằng số yêu cầu thành công trong đợt tranh chấp này");
  console.log(`✓ ${N} yêu cầu sửa gần như đồng thời: ${wins} thành công, seq liên tục không trùng, còn lại 409 stale`);
} finally {
  await sql("DELETE FROM catalog_item WHERE code = 'ZH1'").catch((e) => console.error("dọn danh mục giả ZH1 thất bại:", String(e).slice(0, 200)));
}
```

**Kết quả thật lúc thi công (khác bản dự thảo gốc ở trên — xem ghi chú "SỬA SO VỚI BẢN DỰ THẢO GỐC" ở Task 3 Step 2):** bản dự thảo ban đầu của cả cơ chế ghi (WHERE-guard) LẪN kịch bản e2e (kỳ vọng đúng 1 thắng) đều sai — sửa cả hai theo phát hiện thật lúc chạy `npm run test:e2e -- dispatch`, không phải đoán trước. Đây đúng tinh thần TDD: viết dự thảo tốt nhất có thể, CHẠY THẬT để lộ chỗ sai, sửa theo bằng chứng.

- [ ] **Step 5: Chạy `npm run test:e2e -- dispatch`, sửa tới khi xanh**

- [ ] **Step 6: `npm test && npm run typecheck && npm run test:e2e` (đầy đủ — rút kinh nghiệm từ kế hoạch huỷ đơn: chạy hết, không chỉ `dispatch`, để bắt các chỗ khác lỡ giả định sai)**

- [ ] **Step 7: Commit**

```bash
git add src/shared/contracts.ts src/modules/dispatch/index.ts tests/e2e/dispatch.mjs
git commit -m "$(cat <<'EOF'
Route sửa số khách cho FIELD đang phụ trách (ADR-0014 điều 6)

POST /api/orders/:id/handler-money-edit, module dispatch (FIELD không
dùng /api/orders*). Không lộ giá cho FIELD (phản hồi chỉ { ok: true }).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Bất biến dữ liệu bổ sung + tài liệu mô tả + kiểm toàn bộ

**Files:**
- Modify: `scripts/audit-checks.mjs` (thêm kiểm liên tục `seq`)
- Modify: `src/audit-invariants.test.ts` (test cho kiểm mới)
- Modify: `src/shared/permissions.ts` (bỏ `order.money.edit` khỏi danh sách "chưa có route")
- Modify: `docs/SYSTEM-DESIGN.md` (dòng `order.money.edit` ở bảng §8)
- Modify: `docs/data-dictionary.json` rồi chạy `npm run dict` (bảng mới `order_money_adjustment`)

- [ ] **Step 1: Thêm kiểm `R-ORD-4` (lưới thứ hai cho khoá lạc quan — P21: mọi kiểm soát trọng yếu có ≥ 2 lớp)**

`scripts/audit-checks.mjs`, thêm vào mảng `CHECKS`:
```js
// R-ORD-4: seq của order_money_adjustment liên tục từ 1, không trùng, không nhảy cóc — lưới thứ hai cho khoá lạc quan ở insertMoneyAdjustment
// (nếu có lỗ trong logic ghi, đây là chỗ phát hiện, không cần đợi tranh chấp thật xảy ra).
{
  code: "R-ORD-4",
  what: "seq của order_money_adjustment liên tục từ 1 theo từng đơn",
  sql: `SELECT count(*) FROM (
    SELECT order_id, seq, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY seq) AS rn
    FROM order_money_adjustment
  ) WHERE seq <> rn`,
  level: "fail",
},
```

- [ ] **Step 2: Test cho `R-ORD-4`** — thêm vào `src/audit-invariants.test.ts` (đọc lại cấu trúc tệp hiện có trước khi thêm, dùng đúng khuôn `build()`/`violations()`/`one()` đã có; cần seed thêm bảng `order_money_adjustment` nếu chưa nằm trong `FILES` tới migration hiện tại — kiểm bằng chạy thử trước khi viết assertion).

- [ ] **Step 3: Chạy `node --test src/audit-invariants.test.ts`, xác nhận xanh**

- [ ] **Step 4: Sửa `src/shared/permissions.ts`** — đoạn chú thích ở đầu `MATRIX` (đã sửa một lần ở kế hoạch huỷ đơn, giờ sửa tiếp câu về `order.money.edit`):

Tìm dòng `order.money.edit (FIELD) CHƯA thi công: chặn bởi xung đột kiến trúc...` — thay bằng câu xác nhận đã có route (`POST /api/orders/:id/handler-money-edit`, module `dispatch`).

Sửa comment ở ô `"order.money.edit": row(...)` thêm route thật.

- [ ] **Step 5: Sửa `docs/SYSTEM-DESIGN.md`** dòng `order.money.edit` (bảng §8, tương tự dòng `order.cancel` đã sửa ở kế hoạch trước).

- [ ] **Step 6: Thêm bảng vào `docs/data-dictionary.json`, chạy `npm run dict`**

Đọc cấu trúc tệp JSON hiện có (một bảng khác làm mẫu, ví dụ mục `order_service` hay `dsp_assignment`) trước khi thêm mục `order_money_adjustment` — theo đúng khuôn (tên cột, kiểu, mô tả tiếng Việt).

- [ ] **Step 7: Chạy toàn bộ kiểm**

```bash
npm test
npm run typecheck
npm run test:e2e
```
Kỳ vọng: mọi test xanh, 0 lỗi kiểu, mọi kịch bản e2e xanh (kể cả `audit-invariants --strict` cuối chuỗi).

- [ ] **Step 8: Commit**

```bash
git add scripts/audit-checks.mjs src/audit-invariants.test.ts src/shared/permissions.ts docs/SYSTEM-DESIGN.md docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "$(cat <<'EOF'
Lưới thứ hai R-ORD-4 + cập nhật tài liệu mô tả cho order.money.edit (FIELD)

seq của order_money_adjustment phải liên tục từ 1 theo từng đơn — lưới
thứ hai cho khoá lạc quan ở insertMoneyAdjustment (P21). permissions.ts,
SYSTEM-DESIGN.md, data-dictionary: order.money.edit (FIELD) đã có route
thật.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Kiểm độc lập (bắt buộc — CLAUDE.md §3, việc lớn: tiền + dữ liệu + quyền)

Không phải một commit. Gọi Agent tool (subagent_type mặc định/general-purpose, KHÔNG "fork"), giao nhiệm vụ đọc lại toàn bộ mã của kế hoạch này (7 task, tìm bằng `git log --oneline` trên nhánh), tự chạy `npm test`/`npm run typecheck`/`npm run test:e2e`, và rà đặc biệt:

- `order_service`/`order_item`/cột tiền của `orders` có bị route mới đụng vào ở BẤT KỲ đường nào không (đọc kỹ `editMoneyAsHandler`, `insertMoneyAdjustment`) — đây là bất biến quan trọng nhất.
- Khoá lạc quan (`insertMoneyAdjustment`) có thực sự chặn hai lần ghi gần như đồng thời không — đọc kỹ câu SQL, không chỉ tin test.
- `parseMoneyEditInput` có thực sự bắt buộc ĐỦ tập dịch vụ từ danh mục, không thiếu không thừa — thử tay một ca thiếu 1 dịch vụ.
- FIELD có thấy giá/tổng tiền ở BẤT KỲ đâu trong phản hồi của route ghi không (đọc kỹ `HandlerMoneyEditResponse` và code trả JSON).
- `applyAdjustmentToOrder`/`loadOrderView`: đơn KHÔNG có điều chỉnh vẫn hiển thị đúng như hôm nay (không bị vỡ bởi thay đổi này).
- Trigger chỉ-thêm của `order_money_adjustment` có thật sự chặn UPDATE/DELETE không (chạy tay một câu SQL thử).

Chỉ báo "đạt" với chủ dự án SAU KHI có báo cáo này. Có lỗ thì vá ngay, kiểm độc lập lại đúng chỗ vừa vá.
