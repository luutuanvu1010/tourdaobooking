# Gắn hồ sơ khách vào đơn (N2 lát 1, P-4) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mỗi đơn trỏ được tới hồ sơ người đặt (`orders.booker_party_id`): chọn hồ sơ có sẵn theo SĐT, tạo hồ sơ mới cùng lúc lưu đơn, hoặc bỏ qua; đổi được khách của đơn đã xác nhận.

**Architecture:** Một migration chỉ-thêm (cột được để trống + chỉ mục). Luật thuần dùng chung ở `src/shared/booker.ts` (+ `src/shared/party-id.ts`); `orders` kiểm đầu vào ở `rules.ts`, đọc hồ sơ qua view công bố `v_pty_party_label`, tạo hồ sơ mới bằng `newPersonStatements` của `parties` trong CÙNG `db.batch()` với đơn. Route mới `PUT /api/orders/:id/booker` (quyền `order.trip.edit`, đơn nháp hoặc đã xác nhận). Giao diện: khối "Hồ sơ khách" dùng chung (`web/booker-picker.ts`) ở form đơn và ở bảng "Đổi khách" (`web/booker-sheet.ts`) của trang đơn.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), giao diện TS thuần (`h()`), esbuild, `node --test` (Node 22, `node:sqlite`), e2e `tests/e2e/*.mjs`.

**Spec:** `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md` (ba câu hỏi đã được chủ dự án quyết 2026-09-21) + `docs/adr/ADR-0011-khach-tren-don-ngoai-le-quyen.md` (accepted). Nền: ADR-0001 mục 7–8, ADR-0002, ADR-0003 điều 10, ADR-0007.

## Global Constraints

- Tiếng Việt CÓ DẤU cho mọi chữ người dùng thấy, thông báo lỗi, tài liệu, thông điệp commit (CLAUDE.md §5). Không lộ mã thô tiếng Anh cho người dùng.
- **Nhật ký KHÔNG ghi SĐT/email/MST** (CLAUDE.md §5) — chỉ tên hiển thị.
- Migration chỉ thêm tệp mới; không dựng lại bảng `orders` (ADR-0003 điều 10). Số migration của lát này: **`0018`** (tệp cuối hiện là `0017_order_status_audit_guards.sql`); B5 `staff_party_required` lùi sang **`0019`**.
- `src/shared/` import nhau KÈM đuôi `.ts`; `web/` import `shared` KHÔNG đuôi; `src/shared/` và `web/` không import `src/modules/` (CLAUDE.md §5).
- Module chỉ import module khác qua `index.ts`; `orders` đọc hồ sơ CHỈ qua view `v_pty_party_label` (ADR-0002 điều 3); cạnh `orders → parties` đã được phép.
- Không `innerHTML` — dựng DOM bằng `h()` (`web/dom.ts`). CSS sau dấu mốc `/* ---------- app iPhone (PWA)` của `public/app.css` chỉ dùng token (không hex/`px` ngoài `1px`/`rem`/`em`). Ô gõ 16px.
- Quyết định chủ dự án (ADR-0011): **A** lập đơn không gắn được, nhãn "Chưa gắn hồ sơ khách"; **B** route lập/sửa đơn tạo hồ sơ cá nhân MỚI + vai `CUSTOMER` cùng batch (chỉ vậy — không thêm vai cho hồ sơ có sẵn, không mở route vai trò); **C** đổi khách của đơn đã xác nhận = thông tin vận hành, quyền `order.trip.edit`, đơn đã huỷ thì không, nhật ký "từ A sang B" bằng tên.
- Chỉ hồ sơ **cá nhân đang hoạt động** gắn được; tổ chức/đại lý để ngoài lát 1 (đặc tả §8 mục 2).
- Mỗi task: test đỏ trước, xanh sau; cuối task chạy `npm test` + `npm run typecheck`; task chạm API/migration chạy thêm `npm run test:e2e -- <kịch bản>` (cần mạng). Không `git push`, không deploy, không `--remote` (CLAUDE.md §6).

## Lệch đặc tả có chủ ý (ghi để người rà soát biết)

1. Đặc tả §5 mục 2 đề nghị route báo "Hồ sơ vừa bị ngưng, đơn đã lưu nhưng chưa gắn khách" khi hồ sơ bị ngưng đúng giữa lúc kiểm và lúc ghi. Kế hoạch KHÔNG thêm thông báo đó: form chuyển thẳng sang trang đơn, và trang đơn hiện "Chưa gắn hồ sơ khách" — đúng sự thật, không cần thêm trường vào hợp đồng. Trường hợp này gần như không xảy ra (cần một quản trị viên ngưng hồ sơ trong vài mili-giây).
2. **Giới hạn đã biết:** sửa đơn NHÁP kèm "tạo hồ sơ mới" mà đúng lúc đó người khác lưu đơn (409 `stale`) thì hồ sơ mới vẫn được tạo (câu tạo hồ sơ đứng trước câu sửa đơn vì khoá ngoại, và `newPersonStatements` của `parties` không nhận điều kiện). Hệ quả: một hồ sơ khách thừa, có nhật ký `party_created` — quản trị viên ngưng được. Tạo đơn MỚI không bị (batch lỗi thì huỷ cả).

## Bản đồ tệp

| Tệp | Task | Trách nhiệm |
|---|---|---|
| `src/shared/party-id.ts` (+ test) | 1 | Regex id hồ sơ — một nguồn server ↔ web |
| `src/shared/booker.ts` (+ test) | 1 | Dạng dữ liệu người đặt, kiểm đầu vào, câu chữ, mẩu nhật ký |
| `src/modules/parties/rules.ts` | 1 | Tái xuất `PARTY_ID_RE` từ shared |
| `migrations/0018_orders_booker_party.sql`, `src/migrations-0018.test.ts` | 2 | Cột + chỉ mục |
| `CLAUDE.md`, `docs/*.md` (số B5) | 2 | B5 lùi sang `0019` |
| `src/shared/contracts.ts` | 3, 4 | `OrderInput`/`BookerChangeInput` (3), `OrderDto` (4) |
| `src/modules/orders/rules.ts` (+ test) | 3 | `validateOrder` nhận người đặt; `validateBookerChange` |
| `src/modules/orders/repository.ts`, `service.ts`, `index.ts` | 4, 5 | Ghi/đọc người đặt; route đổi khách |
| `src/shared/audit-actions.ts` | 5 | Hành động `booker_changed` |
| `tests/e2e/booker.mjs`, `tests/e2e/run.mjs` | 4, 5 | Kịch bản e2e mới |
| `web/booker-picker.ts`, `web/order-form.ts`, `public/order-form.html`, `public/app.css` | 6 | Khối "Hồ sơ khách" ở form |
| `web/booker-sheet.ts`, `web/order.ts` | 7 | Hiện hồ sơ + bảng "Đổi khách" ở trang đơn |
| `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-N1.md`, `CLAUDE.md`, đặc tả | 8 | Tài liệu + runbook triển khai |

---

### Task 1: Luật thuần dùng chung — id hồ sơ và người đặt

**Files:**
- Create: `src/shared/party-id.ts`, `src/shared/party-id.test.ts`, `src/shared/booker.ts`, `src/shared/booker.test.ts`
- Modify: `src/modules/parties/rules.ts:1-10`

**Interfaces:**
- Produces: `PARTY_ID_RE` (`src/shared/party-id.ts`); từ `src/shared/booker.ts`: `type BookerInput`, `type BookerChoice`, `NO_BOOKER_TEXT`, `parseBooker(bookerPartyId: unknown, newBooker: unknown)`, `canPickMatch(m)`, `matchNote(m)`, `lookupReady(phone: string)`, `bookerPayload(choice, name, phone)`, `describeBookerChange(before, after)`.

- [ ] **Step 1: Viết test đỏ**

`src/shared/party-id.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { PARTY_ID_RE } from "./party-id.ts";

const U = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("PARTY_ID_RE: UUID và pty-<uuid> hợp lệ; tiền tố khác, rỗng, chữ hoa, thừa ký tự thì không", () => {
  assert.ok(PARTY_ID_RE.test(U));
  assert.ok(PARTY_ID_RE.test(`pty-${U}`));
  for (const bad of ["", "pty-x", `ptr-${U}`, U.toUpperCase(), `${U}x`, `x${U}`]) assert.equal(PARTY_ID_RE.test(bad), false, bad);
});
```

`src/shared/booker.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { bookerPayload, canPickMatch, describeBookerChange, lookupReady, matchNote, parseBooker } from "./booker.ts";

const U = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("parseBooker: vắng cả hai (undefined/null/rỗng) = không gắn", () => {
  for (const [id, nb] of [[undefined, undefined], [null, null], ["", undefined]] as const) assert.deepEqual(parseBooker(id, nb), { ok: true, value: { kind: "none" } });
});

test("parseBooker: hồ sơ có sẵn — UUID hoặc pty-UUID; sai dạng bị từ chối", () => {
  assert.deepEqual(parseBooker(U, undefined), { ok: true, value: { kind: "existing", partyId: U } });
  assert.deepEqual(parseBooker(`pty-${U}`, null), { ok: true, value: { kind: "existing", partyId: `pty-${U}` } });
  for (const bad of ["x", 42, `ptr-${U}`]) assert.deepEqual(parseBooker(bad, undefined), { ok: false, message: "Hồ sơ khách không hợp lệ." });
});

test("parseBooker: gửi cả hai → lỗi", () => {
  assert.deepEqual(parseBooker(U, { fullName: "A", phone: "0901234567" }), { ok: false, message: "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới." });
});

test("parseBooker: hồ sơ mới — gọn khoảng trắng tên, chuẩn hoá SĐT; thiếu tên / số không phải Việt Nam / sai dạng bị từ chối", () => {
  assert.deepEqual(parseBooker(undefined, { fullName: "  Trần   Thị B ", phone: "+84 901 234 567" }), { ok: true, value: { kind: "new", fullName: "Trần Thị B", phone: "0901234567" } });
  assert.deepEqual(parseBooker(undefined, { fullName: " ", phone: "0901234567" }), { ok: false, message: "Cần tên khách để tạo hồ sơ." });
  const r = parseBooker(undefined, { fullName: "A", phone: "+1 415 555 0100" });
  assert.ok(!r.ok && /số điện thoại Việt Nam 10 số/.test(r.message));
  assert.deepEqual(parseBooker(undefined, ["A"]), { ok: false, message: "Thông tin tạo hồ sơ khách không hợp lệ." });
  assert.deepEqual(parseBooker(undefined, { fullName: "A".repeat(201), phone: "0901234567" }), { ok: false, message: "Tên khách tối đa 200 ký tự." });
});

test("canPickMatch / matchNote: chỉ cá nhân đang hoạt động chọn được", () => {
  assert.equal(canPickMatch({ kind: "PERSON", active: true }), true);
  assert.equal(canPickMatch({ kind: "PERSON", active: false }), false);
  assert.equal(canPickMatch({ kind: "ORGANIZATION", active: true }), false);
  assert.equal(matchNote({ kind: "PERSON", active: true }), null);
  assert.equal(matchNote({ kind: "PERSON", active: false }), "đã ngưng");
  assert.equal(matchNote({ kind: "ORGANIZATION", active: true }), "tổ chức — chưa gắn được vào đơn ở bản này");
});

test("lookupReady: cùng chuẩn với máy chủ (số Việt Nam 10 số)", () => {
  assert.equal(lookupReady("0901 234 567"), true);
  assert.equal(lookupReady("+84901234567"), true);
  assert.equal(lookupReady("090123"), false);
  assert.equal(lookupReady("+1 415 555 0100"), false);
});

test("bookerPayload: lựa chọn giao diện → trường gửi lên", () => {
  assert.deepEqual(bookerPayload({ kind: "none" }, "A", "0901"), { bookerPartyId: null });
  assert.deepEqual(bookerPayload({ kind: "existing", partyId: U, name: "B" }, "A", "0901"), { bookerPartyId: U });
  assert.deepEqual(bookerPayload({ kind: "new" }, "  Trần B ", " 0901234567 "), { newBooker: { fullName: "Trần B", phone: "0901234567" } });
});

test("describeBookerChange: chỉ tên, null khi không đổi", () => {
  const a = { id: "a", name: "Nguyễn A" };
  const b = { id: "b", name: "Trần B" };
  const none = { id: null, name: null };
  assert.equal(describeBookerChange(a, a), null);
  assert.equal(describeBookerChange(none, none), null);
  assert.equal(describeBookerChange(none, b), "gắn hồ sơ khách “Trần B”");
  assert.equal(describeBookerChange(a, none), "bỏ gắn hồ sơ khách “Nguyễn A”");
  assert.equal(describeBookerChange(a, b), "đổi hồ sơ khách “Nguyễn A” → “Trần B”");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/shared/party-id.test.ts src/shared/booker.test.ts`
Expected: FAIL — `Cannot find module …/party-id.ts` và `…/booker.ts`.

- [ ] **Step 3: Viết mã**

`src/shared/party-id.ts`:

```ts
// id hồ sơ `pty_party.id`: UUID, hoặc 'pty-<uuid staff>' của hồ sơ nhân sự do migration 0012 tạo.
// Thuần, một nguồn cho server ↔ web (CLAUDE.md §5): module `parties` tái xuất; luật thuần của `orders` và giao diện import thẳng từ đây.
export const PARTY_ID_RE = /^(?:pty-)?[0-9a-f-]{36}$/;
```

`src/shared/booker.ts`:

```ts
// Người đặt (hồ sơ khách) gắn vào đơn — N2 lát 1 (docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md), ADR-0011.
// Thuần, dùng chung server (orders/rules.ts kiểm đầu vào, orders/service.ts ghi nhật ký) ↔ web (form đơn, bảng đổi khách): một nguồn cho dạng dữ liệu và câu chữ.
import type { PartyListItemDto } from "./contracts.ts";
import { PARTY_ID_RE } from "./party-id.ts";
import { normalizePhone } from "./phone.ts";

/** Đầu vào đã kiểm: không gắn / gắn hồ sơ có sẵn / tạo hồ sơ cá nhân mới cùng batch với đơn (ADR-0011 điều 1). `phone` đã chuẩn hoá 0xxxxxxxxx. */
export type BookerInput = { kind: "none" } | { kind: "existing"; partyId: string } | { kind: "new"; fullName: string; phone: string };

/** Lựa chọn trên giao diện (chưa gửi): hồ sơ có sẵn mang theo tên để hiển thị. */
export type BookerChoice = { kind: "none" } | { kind: "existing"; partyId: string; name: string } | { kind: "new" };

export const NO_BOOKER_TEXT = "Chưa gắn hồ sơ khách";
const MAX_NAME = 200;

type Parsed = { ok: true; value: BookerInput } | { ok: false; message: string };
const absent = (v: unknown): boolean => v === undefined || v === null || v === "";

/** Kiểm hai trường `bookerPartyId` / `newBooker` của thân yêu cầu. Vắng cả hai = không gắn (câu hỏi A của đặc tả: được bỏ qua). */
export function parseBooker(bookerPartyId: unknown, newBooker: unknown): Parsed {
  const hasExisting = !absent(bookerPartyId);
  const hasNew = newBooker !== undefined && newBooker !== null;
  if (hasExisting && hasNew) return { ok: false, message: "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới." };
  if (hasExisting) {
    if (typeof bookerPartyId !== "string" || !PARTY_ID_RE.test(bookerPartyId)) return { ok: false, message: "Hồ sơ khách không hợp lệ." };
    return { ok: true, value: { kind: "existing", partyId: bookerPartyId } };
  }
  if (!hasNew) return { ok: true, value: { kind: "none" } };
  if (typeof newBooker !== "object" || Array.isArray(newBooker)) return { ok: false, message: "Thông tin tạo hồ sơ khách không hợp lệ." };
  const b = newBooker as Record<string, unknown>;
  const fullName = typeof b.fullName === "string" ? b.fullName.trim().replace(/\s+/g, " ") : "";
  if (!fullName) return { ok: false, message: "Cần tên khách để tạo hồ sơ." };
  if (fullName.length > MAX_NAME) return { ok: false, message: `Tên khách tối đa ${MAX_NAME} ký tự.` };
  const phone = typeof b.phone === "string" ? normalizePhone(b.phone) : null;
  if (!phone) return { ok: false, message: "Tạo hồ sơ khách cần số điện thoại Việt Nam 10 số (bắt đầu bằng 0 hoặc +84)." };
  return { ok: true, value: { kind: "new", fullName, phone } };
}

type MatchLike = Pick<PartyListItemDto, "kind" | "active">;

/** Hồ sơ trong danh sách trùng số chọn làm người đặt được không: chỉ cá nhân đang hoạt động (đại lý/tổ chức để lát sau — đặc tả §8 mục 2). */
export const canPickMatch = (m: MatchLike): boolean => m.kind === "PERSON" && m.active;

/** Lý do một hồ sơ không chọn được (hiện cạnh tên); null = chọn được. */
export function matchNote(m: MatchLike): string | null {
  if (!m.active) return "đã ngưng";
  if (m.kind !== "PERSON") return "tổ chức — chưa gắn được vào đơn ở bản này";
  return null;
}

/** SĐT đã đủ để tra hồ sơ chưa — cùng chuẩn với máy chủ (`GET /api/parties/lookup` chỉ nhận số Việt Nam 10 số). */
export const lookupReady = (phone: string): boolean => normalizePhone(phone) !== null;

/** Lựa chọn trên giao diện → trường gửi kèm đơn / bảng đổi khách. Hồ sơ mới lấy tên + SĐT đang gõ ở hai ô của đơn. */
export function bookerPayload(choice: BookerChoice, name: string, phone: string): { bookerPartyId: string | null } | { newBooker: { fullName: string; phone: string } } {
  if (choice.kind === "existing") return { bookerPartyId: choice.partyId };
  if (choice.kind === "new") return { newBooker: { fullName: name.trim(), phone: phone.trim() } };
  return { bookerPartyId: null };
}

/** Mẩu nhật ký khi người đặt đổi — CHỈ tên hiển thị, không SĐT (CLAUDE.md §5). null = không đổi. */
export function describeBookerChange(before: { id: string | null; name: string | null }, after: { id: string | null; name: string | null }): string | null {
  if (before.id === after.id) return null;
  const q = (n: string | null): string => `“${n ?? "?"}”`;
  if (before.id === null) return `gắn hồ sơ khách ${q(after.name)}`;
  if (after.id === null) return `bỏ gắn hồ sơ khách ${q(before.name)}`;
  return `đổi hồ sơ khách ${q(before.name)} → ${q(after.name)}`;
}
```

Trong `src/modules/parties/rules.ts`: thêm dòng import cạnh hai import hiện có (dòng 3–4) và thay khối khai báo `PARTY_ID_RE` (dòng 9–10):

```ts
import { PARTY_ID_RE } from "../../shared/party-id.ts";
```

```ts
/** id hồ sơ: UUID, hoặc 'pty-<uuid staff>' của hồ sơ nhân sự do migration 0012 tạo. Nguồn ở src/shared/party-id.ts (dùng chung với `orders` và giao diện). */
export { PARTY_ID_RE };
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/shared/party-id.test.ts src/shared/booker.test.ts src/modules/parties/rules.test.ts`
Expected: PASS (parties/rules.test.ts dòng 121 vẫn xanh nhờ tái xuất).

- [ ] **Step 5: Toàn bộ + commit**

Run: `npm test && npm run typecheck` — Expected: PASS, 0 lỗi.

```bash
git add src/shared/party-id.ts src/shared/party-id.test.ts src/shared/booker.ts src/shared/booker.test.ts src/modules/parties/rules.ts
git commit -m "N2 lát 1: luật thuần người đặt dùng chung (booker.ts) và dời PARTY_ID_RE sang shared

orders/rules.ts là luật thuần nên không được import parties (kéo I/O); giao
diện cũng cần cùng luật. Một nguồn ở src/shared, parties tái xuất."
```
(Thêm dòng `Co-Authored-By` nếu môi trường yêu cầu.)

---

### Task 2: Migration `0018` — cột người đặt; B5 lùi sang `0019`

**Files:**
- Create: `migrations/0018_orders_booker_party.sql`, `src/migrations-0018.test.ts`
- Modify: mọi chỗ ghi "B5 … `0018`" / "tệp cuối `0017`" trong `CLAUDE.md`, `docs/HANDOFF-N1.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `docs/HANDOFF-CHE-DO-BAO-TRI.md`, `docs/HANDOFF-FEEDBACK.md`

**Interfaces:**
- Produces: cột `orders.booker_party_id TEXT NULL REFERENCES pty_party(id)`, chỉ mục `orders_booker_party_idx`.

- [ ] **Step 1: Viết test đỏ** — `src/migrations-0018.test.ts`:

```ts
// Kiểm migration 0018 (N2 lát 1: orders.booker_party_id) trên SQLite thật (node:sqlite). Mẫu: src/migrations-0017.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const before0018 = files.filter((f) => f < "0018");

function open(list: string[] = files): DatabaseSync {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of list) db.exec(readFileSync(new URL(f, DIR), "utf8"));
  return db;
}
const NOW = "2026-09-21T00:00:00.000Z";
const rows = (db: DatabaseSync, sql: string) => db.prepare(sql).all().map((r) => ({ ...r }));

function seed(db: DatabaseSync): void {
  db.exec(`INSERT INTO staff (id, full_name, phone, pin_hash, role, created_at) VALUES ('s1', 'NV', '0900000001', 'x', 'sales', '${NOW}')`);
  db.exec(`INSERT INTO pty_party (id, party_kind, display_name, created_at, updated_at) VALUES ('p1', 'PERSON', 'Khách A', '${NOW}', '${NOW}')`);
}
const insertOrder = (db: DatabaseSync, id: string, booker: string | null) =>
  db.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at, booker_party_id)
           VALUES ('${id}', 'TD-${id}', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}', ${booker === null ? "NULL" : `'${booker}'`})`);

test("0018: cột booker_party_id để trống được, khoá ngoại NO ACTION tới pty_party(id), có chỉ mục", () => {
  const db = open();
  const col = (db.prepare("PRAGMA table_info(orders)").all() as { name: string; notnull: number; dflt_value: unknown }[]).find((c) => c.name === "booker_party_id");
  assert.ok(col, "thiếu cột booker_party_id");
  assert.equal(col.notnull, 0);
  assert.equal(col.dflt_value, null);
  const fk = (db.prepare("PRAGMA foreign_key_list(orders)").all() as { table: string; from: string; to: string; on_delete: string }[]).find((f) => f.from === "booker_party_id");
  assert.deepEqual(fk && { table: fk.table, to: fk.to, on_delete: fk.on_delete }, { table: "pty_party", to: "id", on_delete: "NO ACTION" });
  assert.ok(rows(db, "PRAGMA index_list(orders)").some((i) => i.name === "orders_booker_party_idx"));
});

test("0018: gắn hồ sơ có thật được, hồ sơ không tồn tại bị khoá ngoại chặn, NULL được", () => {
  const db = open();
  seed(db);
  insertOrder(db, "o1", "p1");
  insertOrder(db, "o2", null);
  assert.throws(() => insertOrder(db, "o3", "khong-co"), /FOREIGN KEY/);
  assert.deepEqual(rows(db, "SELECT id, booker_party_id FROM orders ORDER BY id"), [{ id: "o1", booker_party_id: "p1" }, { id: "o2", booker_party_id: null }]);
  assert.deepEqual(rows(db, "PRAGMA foreign_key_check"), []);
});

test("0018: đơn cũ giữ nguyên (người đặt để trống), trigger orders_* không mất", () => {
  const old = open(before0018);
  seed(old);
  old.exec(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, created_at, updated_at) VALUES ('o0', 'TD-o0', 's1', 'draft', 'K', '0900000009', '${NOW}', '${NOW}')`);
  const triggersBefore = rows(old, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'orders' ORDER BY name").map((r) => r.name);
  old.exec(readFileSync(new URL("0018_orders_booker_party.sql", DIR), "utf8"));
  assert.deepEqual(rows(old, "SELECT id, customer_name, booker_party_id FROM orders"), [{ id: "o0", customer_name: "K", booker_party_id: null }]);
  assert.deepEqual(rows(old, "SELECT name FROM sqlite_master WHERE type = 'trigger' AND tbl_name = 'orders' ORDER BY name").map((r) => r.name), triggersBefore);
  assert.ok(triggersBefore.includes("orders_status_transition"), "0017 phải có trước 0018");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/migrations-0018.test.ts`
Expected: FAIL — test 1 "thiếu cột booker_party_id"; test 3 lỗi `ENOENT … 0018_orders_booker_party.sql`.

- [ ] **Step 3: Viết migration** — `migrations/0018_orders_booker_party.sql`:

```sql
-- Migration 0018 — N2 lát 1: người đặt (hồ sơ khách) trên đơn. Đặc tả docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md §2, ADR-0001 mục 7, ADR-0011.
-- Chỉ THÊM (expand). Cột để trống được là BẮT BUỘC: SQLite chỉ cho ADD COLUMN … REFERENCES khi mặc định NULL; không dựng lại `orders`
-- nên các trigger orders_* (0007, 0008, 0017) giữ nguyên. Khoá ngoại NO ACTION; hồ sơ không bao giờ xoá cứng nên khoá ngoại chỉ là lưới.
-- customer_name/phone/email/note GIỮ làm bản chụp lúc đặt. Đơn cũ để trống (lát 2 mới backfill).
ALTER TABLE orders ADD COLUMN booker_party_id TEXT REFERENCES pty_party(id);
CREATE INDEX orders_booker_party_idx ON orders(booker_party_id);
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/migrations-0018.test.ts` — Expected: PASS 3/3.

- [ ] **Step 5: Đổi số B5 trong tài liệu**

Tìm: `grep -rn "0018\|Tệp cuối hiện là\|0001…0017\|Migration kế tiếp" CLAUDE.md docs/*.md`. Sửa:
- mọi chỗ "B5 … dự kiến `0018`" → **`0019`** (vd `0019_staff_party_required.sql`); ghi rõ "`0018` đã dùng cho người đặt trên đơn (N2 lát 1)".
- `CLAUDE.md` §4: `migrations/ 0001…0017` → `0001…0018`, thêm "`0018` người đặt trên đơn (N2 lát 1)"; "Migration kế tiếp lấy số" → `0019`. §9: "`0018_orders_booker_party` có trong repo, CHƯA lên production".
- `docs/CHANGE-GUIDE.md` dòng "Tệp cuối hiện là …" → `0018_orders_booker_party.sql`.
- KHÔNG sửa các nhật ký thi công lịch sử (`docs/superpowers/plans/*-thi-cong-nhat-ky.md`) và báo cáo đối chiếu Oracle TCA.

- [ ] **Step 6: Toàn bộ + commit**

Run: `npm test && npm run typecheck` — Expected: PASS (bài kiểm sổ dữ liệu của `src/architecture.test.ts` không đổi vì sổ không liệt kê cột và cạnh `orders → parties` đã được phép; nếu đỏ, đọc thông báo và bổ sung `docs/data-dictionary.json` rồi `npm run dict`).

```bash
git add migrations/0018_orders_booker_party.sql src/migrations-0018.test.ts CLAUDE.md docs/
git commit -m "Migration 0018: cột orders.booker_party_id (N2 lát 1); B5 lùi sang 0019

Đơn cần trỏ tới hồ sơ người đặt để trả lời 'khách này đặt mấy lần'. Chỉ thêm
cột để trống được + chỉ mục, không dựng lại bảng nên trigger orders_* giữ nguyên."
```

---

### Task 3: Kiểm đầu vào — `validateOrder` nhận người đặt, `validateBookerChange`

**Files:**
- Modify: `src/shared/contracts.ts` (khối `OrderInput`, sau `TripUpdateInput`), `src/modules/orders/rules.ts`
- Test: `src/modules/orders/rules.test.ts`

**Interfaces:**
- Consumes: `parseBooker`, `BookerInput` (Task 1).
- Produces: `ValidOrder.booker: BookerInput`; `validateBookerChange(input: unknown): { ok: true; value: ValidBookerChange } | Failure` với `ValidBookerChange = { customerName: string; customerPhone: string; booker: BookerInput; expectedUpdatedAt: string }`; type `BookerChangeInput` trong contracts.

- [ ] **Step 1: Viết test đỏ** — thêm vào cuối `src/modules/orders/rules.test.ts` (đổi dòng import đầu tệp thành `import { canTransition, orderCodePrefix, validateBookerChange, validateOrder, type ServiceContext } from "./rules.ts";`):

```ts
const PARTY = "0b1c2d3e-4f50-6172-8394-a5b6c7d8e9f0";

test("người đặt: vắng = không gắn; id đúng dạng (UUID, pty-UUID) = hồ sơ có sẵn", () => {
  assert.deepEqual(ok(base).booker, { kind: "none" });
  assert.deepEqual(ok({ ...base, bookerPartyId: null }).booker, { kind: "none" });
  assert.deepEqual(ok({ ...base, bookerPartyId: PARTY }).booker, { kind: "existing", partyId: PARTY });
  assert.deepEqual(ok({ ...base, bookerPartyId: `pty-${PARTY}` }).booker, { kind: "existing", partyId: `pty-${PARTY}` });
});

test("người đặt: id sai dạng, gửi cả hai, hồ sơ mới thiếu tên / số không phải Việt Nam → lỗi", () => {
  assert.equal(message({ ...base, bookerPartyId: "x" }), "Hồ sơ khách không hợp lệ.");
  assert.equal(message({ ...base, bookerPartyId: PARTY, newBooker: { fullName: "A", phone: "0901234567" } }), "Chỉ chọn một: dùng hồ sơ có sẵn hoặc tạo hồ sơ mới.");
  assert.equal(message({ ...base, newBooker: { fullName: " ", phone: "0901234567" } }), "Cần tên khách để tạo hồ sơ.");
  assert.match(message({ ...base, newBooker: { fullName: "A", phone: "+1 415 555 0100" } }), /số điện thoại Việt Nam 10 số/);
});

test("người đặt: hồ sơ mới — tên gọn khoảng trắng, SĐT chuẩn hoá; SĐT trên đơn vẫn giữ nguyên bản gõ", () => {
  const v = ok({ ...base, newBooker: { fullName: "  Trần   Thị B ", phone: "+84 901 234 567" } });
  assert.deepEqual(v.booker, { kind: "new", fullName: "Trần Thị B", phone: "0901234567" });
  assert.equal(v.customerPhone, "0901 234 567");
});

test("đổi khách: kiểm tên/SĐT như đơn, nhận người đặt, bắt buộc expectedUpdatedAt", () => {
  const good = { customerName: " Trần B ", customerPhone: "0909 000 111", bookerPartyId: PARTY, expectedUpdatedAt: "2026-09-21T00:00:00.000Z" };
  const r = validateBookerChange(good);
  assert.ok(r.ok, r.ok ? "" : r.message);
  assert.deepEqual(r.value, { customerName: "Trần B", customerPhone: "0909 000 111", booker: { kind: "existing", partyId: PARTY }, expectedUpdatedAt: "2026-09-21T00:00:00.000Z" });
  const bad = (input: unknown) => {
    const x = validateBookerChange(input);
    assert.ok(!x.ok);
    return x.message;
  };
  assert.equal(bad(null), "Dữ liệu đổi khách không hợp lệ.");
  assert.match(bad({ ...good, customerName: "" }), /Tên khách hàng/);
  assert.equal(bad({ ...good, customerPhone: "abc" }), "Số điện thoại khách không hợp lệ.");
  assert.equal(bad({ ...good, bookerPartyId: "x" }), "Hồ sơ khách không hợp lệ.");
  assert.equal(bad({ ...good, expectedUpdatedAt: "" }), "Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc).");
});
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `node --test src/modules/orders/rules.test.ts`
Expected: FAIL — `validateBookerChange` không có (SyntaxError import) / `booker` undefined.

- [ ] **Step 3: Viết mã**

`src/shared/contracts.ts` — trong `interface OrderInput` thêm SAU `paymentNote: string;`:

```ts
  /** Gắn hồ sơ có sẵn (id `pty_party`, chỉ cá nhân đang hoạt động); null/vắng = không gắn. Không gửi kèm `newBooker`. */
  bookerPartyId?: string | null;
  /** Tạo hồ sơ cá nhân mới + vai CUSTOMER cùng lúc lưu đơn (ADR-0011 điều 1). Không gửi kèm `bookerPartyId`. */
  newBooker?: { fullName: string; phone: string } | null;
```

và sau `interface TripUpdateInput { … }`:

```ts
/** `PUT /api/orders/:id/booker` — đổi khách (hồ sơ người đặt + tên/SĐT chụp trên đơn) của đơn nháp hoặc đã xác nhận (ADR-0011 điều 2). */
export interface BookerChangeInput {
  customerName: string;
  customerPhone: string;
  bookerPartyId?: string | null;
  newBooker?: { fullName: string; phone: string } | null;
  expectedUpdatedAt: string;
}
```

`src/modules/orders/rules.ts`:

1. Thêm import (cạnh các import `../../shared/*.ts`):
```ts
import { parseBooker, type BookerInput } from "../../shared/booker.ts";
```
và đổi dòng `export type { … }` thành `export type { BookerInput, DepositMethod, OrderStatus, ServiceContext, ValidItem, ValidService };`.

2. Trong `interface ValidOrder` thêm sau `customerNote: string | null;`:
```ts
  /** Người đặt (N2 lát 1): không gắn / hồ sơ có sẵn / hồ sơ mới. Service kiểm hồ sơ còn dùng được; repository ghi. */
  booker: BookerInput;
```

3. Thêm hàm (ngay sau `const EMAIL_RE = …`):
```ts
/** Tên + SĐT khách (bản chụp trên đơn) — dùng chung cho tạo/sửa đơn và đổi khách. */
function validateCustomer(b: Record<string, unknown>): { ok: true; name: string; phone: string } | Failure {
  const name = text(b.customerName, "Tên khách hàng", 200, true);
  if (name.error) return fail(name.error);
  const phone = text(b.customerPhone, "Số điện thoại khách", 30, true);
  if (phone.error) return fail(phone.error);
  const phoneValue = phone.value!.replace(/\s+/g, " ");
  if (!PHONE_RE.test(phoneValue)) return fail("Số điện thoại khách không hợp lệ.");
  return { ok: true, name: name.value!, phone: phoneValue };
}
```

4. Trong `validateOrder`, thay 6 dòng kiểm tên/SĐT (từ `const name = text(b.customerName…` tới `if (!PHONE_RE.test(phoneValue)) …`) bằng:
```ts
  const customer = validateCustomer(b);
  if (!customer.ok) return customer;
```
thêm ngay sau dòng `if (paymentNote.error) return fail(paymentNote.error);`:
```ts
  const booker = parseBooker(b.bookerPartyId, b.newBooker);
  if (!booker.ok) return fail(booker.message);
```
và trong đối tượng trả về: `customerName: customer.name, customerPhone: customer.phone,` và thêm `booker: booker.value,` sau `customerNote: note.value,`.

5. Thêm cuối tệp (trước `// draft → confirmed …`):
```ts
export interface ValidBookerChange {
  customerName: string;
  customerPhone: string;
  booker: BookerInput;
  expectedUpdatedAt: string;
}

/** `PUT /api/orders/:id/booker` (ADR-0011 điều 2): tên/SĐT trên đơn + người đặt + mốc khoá lạc quan. */
export function validateBookerChange(input: unknown): { ok: true; value: ValidBookerChange } | Failure {
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("Dữ liệu đổi khách không hợp lệ.");
  const b = input as Record<string, unknown>;
  const customer = validateCustomer(b);
  if (!customer.ok) return customer;
  const booker = parseBooker(b.bookerPartyId, b.newBooker);
  if (!booker.ok) return fail(booker.message);
  if (typeof b.expectedUpdatedAt !== "string" || !b.expectedUpdatedAt) return fail("Thiếu expectedUpdatedAt (mốc cập nhật của đơn mà trang đã đọc).");
  return { ok: true, value: { customerName: customer.name, customerPhone: customer.phone, booker: booker.value, expectedUpdatedAt: b.expectedUpdatedAt } };
}
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `node --test src/modules/orders/rules.test.ts` — Expected: PASS (mọi test cũ vẫn xanh).

- [ ] **Step 5: Toàn bộ + commit**

Run: `npm test && npm run typecheck`. `ValidOrder` có thêm `booker` bắt buộc: nếu tsc báo chỗ nào dựng `ValidOrder` bằng tay (ngoài `validateOrder`), thêm `booker: { kind: "none" }` ở đó. Expected: PASS, 0 lỗi.

```bash
git add src/shared/contracts.ts src/modules/orders/rules.ts src/modules/orders/rules.test.ts
git commit -m "N2 lát 1: kiểm đầu vào người đặt ở validateOrder và validateBookerChange

Máy chủ không tin dữ liệu trình duyệt: dạng id hồ sơ, 'chỉ chọn một', SĐT số
Việt Nam cho hồ sơ mới được kiểm ở luật thuần để test phủ được."
```

---

### Task 4: Máy chủ — lập/sửa đơn nháp kèm người đặt; đọc người đặt

**Files:**
- Modify: `src/shared/contracts.ts` (`OrderDto`), `src/modules/orders/repository.ts`, `src/modules/orders/service.ts`, `src/modules/orders/index.ts` (route `POST /api/orders`, `PUT /api/orders/:id`), `src/shared/order-confirmation.test.ts` (fixture `OrderDto`), `tests/e2e/run.mjs`
- Create: `tests/e2e/booker.mjs`

**Interfaces:**
- Consumes: `ValidOrder.booker`, `BookerInput`, `describeBookerChange` (Task 1, 3); từ `../parties`: `newPersonStatements`, `validatePersonFullName`, `composePersonName`, `type ContactInput`, `type RoleInput`; từ `../audit`: `auditStatement`.
- Produces: `OrderDto.bookerPartyId: string | null`, `OrderDto.bookerName: string | null`; trong `repository.ts`: `interface BookerWrite { partyId: string | null; before: D1PreparedStatement[]; note: string | null }`, `NO_BOOKER: BookerWrite`, `createOrder(db, staffId, order, alsoCreate?, booker = NO_BOOKER)`, `updateDraftOrder(db, id, staffId, order, booker = NO_BOOKER)`, `getMeta` trả thêm `bookerPartyId`, `bookerName`, `customerName`, `customerPhone`; trong `service.ts`: `resolveBooker(db, booker, staffId, now, current?) → Promise<{ ok: true; write: BookerWrite } | { ok: false; message: string }>`.

- [ ] **Step 1: Viết e2e đỏ** — tạo `tests/e2e/booker.mjs` (phần 1; Task 5 viết tiếp cuối tệp):

```js
// Người đặt trên đơn (N2 lát 1, ADR-0011): bỏ qua / gắn hồ sơ có sẵn / tạo hồ sơ mới cùng lúc lưu đơn; máy chủ không tin id từ trình duyệt; nhật ký không lộ SĐT.
import assert from "node:assert/strict";
import { ACCOUNTS, call, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const person = async (fullName, phone = randomPhone()) => {
  const r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName, contacts: [{ kind: "PHONE", value: phone }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.party;
};

// 1) không gắn: đơn vẫn lưu (câu hỏi A)
let r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
assert.equal(r.body.order.bookerName, null);
console.log("✓ lập đơn không gắn hồ sơ khách");

// 2) gắn hồ sơ có sẵn: tên/SĐT trên đơn là bản chụp, không ghi ngược vào hồ sơ
const phoneA = randomPhone();
const existing = await person(`Khách Có Sẵn ${tag}`, phoneA);
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: "Tên gõ trên đơn", customerPhone: phoneA, bookerPartyId: existing.id }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const linked = r.body.order;
assert.equal(linked.bookerPartyId, existing.id);
assert.equal(linked.bookerName, existing.displayName);
assert.equal(linked.customerName, "Tên gõ trên đơn");
assert.equal((await call(SALES, "GET", `/api/parties/${existing.id}`)).body.party.displayName, existing.displayName, "không ghi ngược tên vào hồ sơ");
assert.equal((await call(SALES, "GET", `/api/orders/${linked.id}`)).body.order.bookerName, existing.displayName, "GET đơn đọc được người đặt");
console.log("✓ gắn hồ sơ có sẵn; tên/SĐT trên đơn là bản chụp");

// 3) tạo hồ sơ mới cùng lúc lưu đơn: có vai CUSTOMER, SĐT chính; nhật ký party_created + created, không có SĐT
const phoneN = randomPhone();
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Mới ${tag}`, customerPhone: phoneN, newBooker: { fullName: `Khách Mới ${tag}`, phone: phoneN } }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const withNew = r.body.order;
assert.ok(withNew.bookerPartyId, "đơn phải trỏ hồ sơ mới");
const made = (await call(SALES, "GET", `/api/parties/${withNew.bookerPartyId}`)).body.party;
assert.equal(made.displayName, `Khách Mới ${tag}`);
assert.deepEqual(made.roleCodes, ["CUSTOMER"]);
assert.equal(made.primaryPhone, phoneN);
const logs = await sqlRows(`SELECT action, detail FROM audit_log WHERE target_id = '${withNew.bookerPartyId}' OR order_id = '${withNew.id}'`);
assert.ok(logs.some((a) => a.action === "party_created"), JSON.stringify(logs));
assert.ok(logs.some((a) => a.action === "created" && /gắn hồ sơ khách/.test(a.detail ?? "")), JSON.stringify(logs));
assert.ok(logs.every((a) => !String(a.detail ?? "").includes(phoneN)), "nhật ký không chứa SĐT");
console.log("✓ tạo hồ sơ mới + vai CUSTOMER cùng lúc lưu đơn; nhật ký không lộ SĐT");

// 4) đơn không hợp lệ thì KHÔNG tạo hồ sơ
const ghost = `Không Được Tạo ${tag}`;
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [], newBooker: { fullName: ghost, phone: randomPhone() } }));
assert.equal(r.status, 400);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM pty_party WHERE display_name = '${ghost}'`))[0].n, 0);
console.log("✓ đơn lỗi thì không có hồ sơ mồ côi");

// 5) máy chủ không tin id: không tồn tại / sai dạng / tổ chức / đã ngưng → 400
for (const bad of ["00000000-0000-0000-0000-000000000000", "khong-phai-id"]) {
  r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: bad }));
  assert.equal(r.status, 400, bad);
}
const org = (await call(SALES, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý ${tag}` })).body.party;
r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: org.id }));
assert.equal(r.status, 400);
assert.match(r.body.error.message, /đại lý/);
const stopped = await person(`Đã Ngưng ${tag}`);
await sql(`UPDATE pty_party SET active = 0 WHERE id = '${stopped.id}'`);
r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: stopped.id }));
assert.equal(r.status, 400);
assert.match(r.body.error.message, /không còn dùng được/);
console.log("✓ id lạ/sai dạng/tổ chức/đã ngưng bị từ chối");

// 6) sửa nháp: đổi hồ sơ (nhật ký 'đổi hồ sơ khách'), rồi bỏ gắn
r = await call(SALES, "PUT", `/api/orders/${linked.id}`, orderInput({ customerName: linked.customerName, customerPhone: linked.customerPhone, bookerPartyId: withNew.bookerPartyId, expectedUpdatedAt: linked.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, withNew.bookerPartyId);
const upd = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${linked.id}' AND action = 'updated'`);
assert.ok(upd.some((a) => /đổi hồ sơ khách/.test(a.detail ?? "")), JSON.stringify(upd));
r = await call(SALES, "PUT", `/api/orders/${linked.id}`, orderInput({ bookerPartyId: null, expectedUpdatedAt: r.body.order.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
console.log("✓ sửa nháp: đổi và bỏ gắn hồ sơ khách");

// 7) đơn đã xác nhận: PUT đơn vẫn 409 not_editable (đổi khách đi đường riêng — Task 5)
r = await call(SALES, "POST", `/api/orders/${withNew.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const confirmed = r.body.order;
r = await call(SALES, "PUT", `/api/orders/${confirmed.id}`, orderInput({ bookerPartyId: null, expectedUpdatedAt: confirmed.updatedAt }));
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "not_editable");
console.log("✓ đơn đã xác nhận không sửa qua PUT đơn");
```

Trong `tests/e2e/run.mjs`, thêm `"booker"` vào mảng `ALL` ngay sau `"parties"`.

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `npm run test:e2e -- booker` (cần mạng)
Expected: FAIL ở bước 1 — `r.body.order.bookerPartyId` là `undefined`, không phải `null`.

- [ ] **Step 3: Hợp đồng** — `src/shared/contracts.ts`, trong `interface OrderDto` thêm sau `staffName: string;`:

```ts
  /** Hồ sơ người đặt (N2 lát 1, ADR-0011); null = chưa gắn (đơn cũ hoặc bỏ qua). */
  bookerPartyId: string | null;
  /** Nhãn hồ sơ người đặt (view `v_pty_party_label`); null khi chưa gắn. */
  bookerName: string | null;
```

Sửa fixture `OrderDto` trong `src/shared/order-confirmation.test.ts` (tsc sẽ chỉ đúng chỗ): thêm `bookerPartyId: null, bookerName: null`.

- [ ] **Step 4: Repository** — `src/modules/orders/repository.ts`:

1. `interface OrderRow` thêm `booker_party_id: string | null;` và `booker_name: string | null;`.
2. Thay `ORDER_SELECT`:
```ts
const ORDER_SELECT = `SELECT o.*, s.label AS staff_name, b.display_name AS booker_name FROM orders o
  JOIN v_stf_staff_label s ON s.id = o.staff_id LEFT JOIN v_pty_party_label b ON b.id = o.booker_party_id`;
```
3. `toDto` thêm sau `staffName: r.staff_name,`: `bookerPartyId: r.booker_party_id, bookerName: r.booker_name,`.
4. Thay `getMeta`:
```ts
export interface OrderMeta {
  status: OrderStatus;
  staffId: string;
  updatedAt: string;
  bookerPartyId: string | null;
  bookerName: string | null;
  customerName: string;
  customerPhone: string;
}

export async function getMeta(db: D1Database, id: string): Promise<OrderMeta | null> {
  const row = await db
    .prepare(
      `SELECT o.status, o.staff_id, o.updated_at, o.booker_party_id, b.display_name AS booker_name, o.customer_name, o.customer_phone
       FROM orders o LEFT JOIN v_pty_party_label b ON b.id = o.booker_party_id WHERE o.id = ?`,
    )
    .bind(id)
    .first<{ status: OrderStatus; staff_id: string; updated_at: string; booker_party_id: string | null; booker_name: string | null; customer_name: string; customer_phone: string }>();
  return row
    ? { status: row.status, staffId: row.staff_id, updatedAt: row.updated_at, bookerPartyId: row.booker_party_id, bookerName: row.booker_name, customerName: row.customer_name, customerPhone: row.customer_phone }
    : null;
}
```
5. Thêm (sau `wonGuard`):
```ts
/**
 * Người đặt đã được service kiểm, sẵn để ghi. `before` = câu tạo hồ sơ mới (+ nhật ký `party_created`) của `parties`, đứng TRƯỚC câu ghi đơn
 * trong CÙNG batch vì khoá ngoại. `note` = mẩu nhật ký của đơn (chỉ tên).
 */
export interface BookerWrite {
  partyId: string | null;
  before: D1PreparedStatement[];
  note: string | null;
}
export const NO_BOOKER: BookerWrite = { partyId: null, before: [], note: null };

/**
 * Giá trị ghi vào `orders.booker_party_id`: chỉ khi hồ sơ còn là CÁ NHÂN ĐANG HOẠT ĐỘNG (đọc qua view công bố của `parties`, ADR-0002 điều 3), không thì NULL —
 * lưới cho khoảng giữa lúc service kiểm và lúc ghi; KHÔNG đặt EXISTS vào WHERE (đơn sẽ chèn 0 dòng lặng lẽ). Hai tham số: cùng id.
 */
const BOOKER_VALUE = `CASE WHEN EXISTS (SELECT 1 FROM v_pty_party_label WHERE id = ? AND active = 1 AND party_kind = 'PERSON') THEN ? END`;

const joinDetail = (...parts: (string | null | undefined)[]): string | undefined => parts.filter((p): p is string => !!p).join(" | ") || undefined;
```
6. `createOrder`: thêm tham số cuối `booker: BookerWrite = NO_BOOKER`; trong batch đặt `...booker.before,` TRƯỚC câu INSERT đơn; câu INSERT thêm cột và giá trị:
```ts
            `INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, customer_email, customer_note,
               subtotal, discount, total, deposit_amount, deposit_method, remaining_amount, payment_note, created_at, updated_at, booker_party_id)
             SELECT ?, ? || printf('%04d', COALESCE((SELECT MAX(CAST(substr(order_code, length(?) + 1) AS INTEGER)) FROM orders WHERE order_code LIKE ?), 0) + 1),
               ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${BOOKER_VALUE}`,
```
và `.bind(…, at, at, booker.partyId, booker.partyId)` (THÊM đúng hai đối số cuối — bẫy bind theo vị trí, CHANGE-GUIDE a1 bước 4). Nhật ký: `detail: joinDetail(summarizeDeviations(order.items), booker.note)`. Cập nhật chú thích hàm: "`booker.before` đứng đầu batch".
7. `updateDraftOrder`: thêm tham số cuối `booker: BookerWrite = NO_BOOKER`; batch bắt đầu bằng `...booker.before,`; câu UPDATE:
```ts
        `UPDATE orders SET customer_name = ?, customer_phone = ?, customer_email = ?, customer_note = ?,
           subtotal = ?, discount = ?, total = ?, deposit_amount = ?, deposit_method = ?, remaining_amount = ?, payment_note = ?,
           booker_party_id = ${BOOKER_VALUE}, updated_at = ?
         WHERE id = ? AND status = 'draft' AND updated_at = ?`,
```
bind: `…, order.paymentNote, booker.partyId, booker.partyId, at, id, order.expectedUpdatedAt`. Nhật ký `detail: joinDetail(summarizeDeviations(order.items), booker.note)`. **Giá trị trả về đổi chỉ số:** `return (results[booker.before.length]!.meta.changes ?? 0) > 0;` (câu UPDATE không còn ở vị trí 0). Chú thích hàm ghi giới hạn đã biết: hồ sơ mới trong `before` không mang điều kiện thắng, nên thua khoá lạc quan vẫn để lại một hồ sơ thừa.

- [ ] **Step 5: Service** — `src/modules/orders/service.ts`, thêm:

```ts
import { auditStatement } from "../audit";
import { composePersonName, newPersonStatements, validatePersonFullName, type ContactInput, type RoleInput } from "../parties";
import { describeBookerChange, type BookerInput } from "../../shared/booker";
import { vnToday } from "../../shared/vn-date";
import type { BookerWrite } from "./repository";

export type ResolvedBooker = { ok: true; write: BookerWrite } | { ok: false; message: string };

/**
 * Người đặt đã kiểm dạng → câu ghi. Hồ sơ có sẵn phải là CÁ NHÂN ĐANG HOẠT ĐỘNG (view công bố `v_pty_party_label`). Hồ sơ mới: cá nhân + SĐT chính +
 * vai CUSTOMER bằng câu của `parties`, CÙNG batch với đơn — ADR-0011 điều 1 (ngoại lệ hẹp của ADR-0007: chỉ hồ sơ MỚI, chỉ CUSTOMER). `current` = người đặt
 * đang lưu trên đơn (để viết mẩu nhật ký "từ A sang B"; tạo đơn = không có).
 */
export async function resolveBooker(
  db: D1Database,
  booker: BookerInput,
  staffId: string,
  now: Date,
  current: { id: string | null; name: string | null } = { id: null, name: null },
): Promise<ResolvedBooker> {
  if (booker.kind === "none") return { ok: true, write: { partyId: null, before: [], note: describeBookerChange(current, { id: null, name: null }) } };
  if (booker.kind === "existing") {
    const row = await db
      .prepare("SELECT display_name, party_kind, active FROM v_pty_party_label WHERE id = ?")
      .bind(booker.partyId)
      .first<{ display_name: string; party_kind: "PERSON" | "ORGANIZATION"; active: number }>();
    if (!row || row.active !== 1) return { ok: false, message: "Hồ sơ khách không còn dùng được, hãy chọn lại." };
    if (row.party_kind !== "PERSON") return { ok: false, message: "Chưa gắn được đại lý vào đơn ở bản này." };
    return { ok: true, write: { partyId: booker.partyId, before: [], note: describeBookerChange(current, { id: booker.partyId, name: row.display_name }) } };
  }
  const name = validatePersonFullName(booker.fullName);
  if (!name.ok) return { ok: false, message: name.message };
  const at = now.toISOString();
  const today = vnToday(now);
  const phone: ContactInput = { kind: "PHONE", value: booker.phone, valueNormalized: booker.phone, label: null, isPrimary: true };
  const role: RoleInput = { roleTypeCode: "CUSTOMER", locationId: null, from: today, to: null };
  const made = newPersonStatements(db, { name: name.value, contacts: [phone], roles: [role], contactsFrom: today }, staffId, at);
  const display = composePersonName(name.value);
  // Nhật ký của hồ sơ: như POST /api/parties (loại + tên), KHÔNG SĐT.
  const log = auditStatement(db, { staffId, action: "party_created", at, targetType: "party", targetId: made.partyId, detail: `cá nhân "${display}" (tạo khi lập/sửa đơn)` });
  return { ok: true, write: { partyId: made.partyId, before: [...made.statements, log], note: describeBookerChange(current, { id: made.partyId, name: display }) } };
}
```

- [ ] **Step 6: Route** — `src/modules/orders/index.ts`:

1. Import thêm `resolveBooker` từ `./service`.
2. `POST /api/orders`: sau `if (!parsed.ok) return failure(parsed);` thêm
```ts
      const booker = await resolveBooker(env.DB, parsed.value.booker, staff.id, new Date());
      if (!booker.ok) return error(400, "invalid_input", booker.message);
```
và truyền `booker.write` làm tham số thứ năm của `createOrder(...)`.
3. `PUT /api/orders/:id`: sau khi có `expected` thêm
```ts
      const booker = await resolveBooker(env.DB, parsed.value.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
```
và gọi `updateDraftOrder(env.DB, id, staff.id, { ...parsed.value, expectedUpdatedAt: expected }, booker.write)`.

- [ ] **Step 7: Chạy để thấy xanh**

Run: `npm test && npm run typecheck` — Expected: PASS, 0 lỗi.
Run: `npm run test:e2e -- booker orders` — Expected: cả hai kịch bản in các dòng ✓ và kết thúc không lỗi; `audit-invariants` cuối lượt xanh.

- [ ] **Step 8: Commit**

```bash
git add src/shared/contracts.ts src/shared/order-confirmation.test.ts src/modules/orders/repository.ts src/modules/orders/service.ts src/modules/orders/index.ts tests/e2e/booker.mjs tests/e2e/run.mjs
git commit -m "N2 lát 1: lập/sửa đơn nháp kèm người đặt (hồ sơ có sẵn hoặc tạo mới cùng batch)

Hồ sơ mới + vai CUSTOMER ghi cùng batch với đơn để không có hồ sơ mồ côi
(ADR-0011 điều 1). Hồ sơ có sẵn kiểm hai lớp: service trả 400 rõ ràng, câu ghi
có CASE WHEN EXISTS làm lưới. Đọc người đặt qua view công bố của parties."
```

---

### Task 5: Máy chủ — đổi khách của đơn đã xác nhận (`PUT /api/orders/:id/booker`)

**Files:**
- Modify: `src/shared/audit-actions.ts`, `src/modules/orders/repository.ts`, `src/modules/orders/index.ts`, `tests/e2e/booker.mjs` (viết tiếp cuối tệp)

**Interfaces:**
- Consumes: `validateBookerChange` (Task 3), `resolveBooker`, `BookerWrite`, `getMeta` (Task 4).
- Produces: hành động nhật ký `booker_changed` ("Đổi khách"); `changeBooker(db, orderId, staffId, change: { customerName: string; customerPhone: string; expectedUpdatedAt: string }, booker: BookerWrite, detail: string): Promise<boolean>`; route `PUT /api/orders/:id/booker` trả `OrderResponse`.

- [ ] **Step 1: Viết e2e đỏ** — thêm vào CUỐI `tests/e2e/booker.mjs`:

```js
// ---- Đổi khách của đơn ĐÃ XÁC NHẬN (ADR-0011 điều 2: như thông tin vận hành, quyền order.trip.edit) ----
const OTHER = await session(ACCOUNTS.salesB); // không phải người lập, không phụ trách
const ACC = await session(ACCOUNTS.accountant);
const ADMIN = await session(ACCOUNTS.admin);
const B = (id) => `/api/orders/${id}/booker`;
const now = async (id) => (await call(SALES, "GET", `/api/orders/${id}`)).body.order;

let cur = await now(confirmed.id);
const replacement = await person(`Người Thay ${tag}`);
r = await call(SALES, "PUT", B(cur.id), { customerName: `Người Thay ${tag}`, customerPhone: "0909 000 111", bookerPartyId: replacement.id, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.status, "confirmed");
assert.equal(r.body.order.bookerPartyId, replacement.id);
assert.equal(r.body.order.customerName, `Người Thay ${tag}`);
let changed = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${cur.id}' AND action = 'booker_changed'`);
assert.equal(changed.length, 1, JSON.stringify(changed));
assert.match(changed[0].detail, /đổi hồ sơ khách “Khách Mới .+” → “Người Thay/);
assert.ok(!changed[0].detail.includes("0909"), "nhật ký không chứa SĐT");
console.log("✓ đổi khách của đơn đã xác nhận; nhật ký 'từ A sang B' bằng tên");

// mốc cũ → 409 stale; không đổi gì → 200 và không thêm nhật ký
r = await call(SALES, "PUT", B(cur.id), { customerName: "X", customerPhone: "0909000111", bookerPartyId: null, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "stale");
cur = await now(cur.id);
r = await call(SALES, "PUT", B(cur.id), { customerName: cur.customerName, customerPhone: cur.customerPhone, bookerPartyId: cur.bookerPartyId, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${cur.id}' AND action = 'booker_changed'`))[0].n, 1);
console.log("✓ khoá lạc quan; không đổi gì thì không ghi nhật ký");

// tạo hồ sơ mới ngay khi đổi khách (có vai CUSTOMER)
const phoneX = randomPhone();
r = await call(SALES, "PUT", B(cur.id), { customerName: `Khách Phút Cuối ${tag}`, customerPhone: phoneX, newBooker: { fullName: `Khách Phút Cuối ${tag}`, phone: phoneX }, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual((await call(SALES, "GET", `/api/parties/${r.body.order.bookerPartyId}`)).body.party.roleCodes, ["CUSTOMER"]);
console.log("✓ đổi khách kèm tạo hồ sơ mới");

// quyền: SALES khác (không lập, không phụ trách) và kế toán → 403; quản trị → được
cur = await now(cur.id);
const body = { customerName: cur.customerName, customerPhone: cur.customerPhone, bookerPartyId: null, expectedUpdatedAt: cur.updatedAt };
assert.equal((await call(OTHER, "PUT", B(cur.id), body)).status, 403);
assert.equal((await call(ACC, "PUT", B(cur.id), body)).status, 403);
r = await call(ADMIN, "PUT", B(cur.id), body);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
console.log("✓ quyền đổi khách = quyền sửa chuyến");

// đơn đã huỷ → 409 not_editable; id lạ → 404; đầu vào sai → 400
r = await call(SALES, "POST", `/api/orders/${cur.id}/status`, { status: "cancelled" });
assert.equal(r.status, 200, JSON.stringify(r.body));
cur = r.body.order;
r = await call(SALES, "PUT", B(cur.id), { customerName: "Y", customerPhone: "0909000111", bookerPartyId: null, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "not_editable");
assert.equal((await call(SALES, "PUT", B("00000000-0000-0000-0000-000000000000"), body)).status, 404);
assert.equal((await call(ADMIN, "PUT", B(linked.id), { customerName: "", customerPhone: "0909000111", expectedUpdatedAt: "x" })).status, 400);
console.log("✓ đơn đã huỷ không đổi khách được; 404; 400");
console.log("E2E OK");
```

- [ ] **Step 2: Chạy để thấy đỏ**

Run: `npm run test:e2e -- booker`
Expected: FAIL ở dòng đổi khách đầu tiên — status 404 (route chưa có).

- [ ] **Step 3: Viết mã**

`src/shared/audit-actions.ts` — thêm sau `order_handler_changed: …`:
```ts
  booker_changed: { label: "Đổi khách", group: "order" },
```

`src/modules/orders/repository.ts` — thêm cuối tệp:
```ts
/**
 * Đổi khách (ADR-0011 điều 2): hồ sơ người đặt + tên/SĐT chụp trên đơn, cho đơn NHÁP hoặc ĐÃ XÁC NHẬN, còn khớp mốc `updated_at`. Không đụng tiền, dịch vụ,
 * số khách. `booker.before` (hồ sơ mới) đứng TRƯỚC câu UPDATE vì khoá ngoại. Trả false nếu đơn đã huỷ / đã bị người khác sửa.
 */
export async function changeBooker(
  db: D1Database,
  orderId: string,
  staffId: string,
  change: { customerName: string; customerPhone: string; expectedUpdatedAt: string },
  booker: BookerWrite,
  detail: string,
): Promise<boolean> {
  const at = nextStamp(change.expectedUpdatedAt);
  const results = await db.batch([
    ...booker.before,
    db
      .prepare(
        `UPDATE orders SET customer_name = ?, customer_phone = ?, booker_party_id = ${BOOKER_VALUE}, updated_at = ?
         WHERE id = ? AND status IN ('draft', 'confirmed') AND updated_at = ?`,
      )
      .bind(change.customerName, change.customerPhone, booker.partyId, booker.partyId, at, orderId, change.expectedUpdatedAt),
    auditStatement(db, { orderId, staffId, action: "booker_changed", at, detail }, "changes() > 0"),
  ]);
  return (results[booker.before.length]!.meta.changes ?? 0) > 0;
}
```

`src/modules/orders/index.ts`:
- import thêm `changeBooker` từ `./repository`, `validateBookerChange` từ `./rules`.
- thêm route ngay SAU route `PUT /api/orders/:id/trip`:
```ts
    // Đổi khách (hồ sơ người đặt + tên/SĐT trên đơn) — đơn nháp HOẶC đã xác nhận: coi như thông tin vận hành, cùng quyền với sửa chuyến (ADR-0011 điều 2).
    route("PUT", "/api/orders/:id/booker", "office", async ({ env, request, params, staff, isAssigned }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const [meta, assigned] = await Promise.all([getMeta(env.DB, id), isAssigned(id)]);
      if (!meta) return NOT_FOUND();
      if (!can(staff, "order.trip.edit", { ownerId: meta.staffId, assigned })) return FORBIDDEN();
      if (meta.status === "cancelled") return CANCELLED();
      const parsed = validateBookerChange(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const v = parsed.value;
      const booker = await resolveBooker(env.DB, v.booker, staff.id, new Date(), { id: meta.bookerPartyId, name: meta.bookerName });
      if (!booker.ok) return error(400, "invalid_input", booker.message);
      const snapshotChanged = v.customerName !== meta.customerName || v.customerPhone !== meta.customerPhone;
      const detail = [booker.write.note, snapshotChanged ? "sửa tên/SĐT khách trên đơn" : null].filter(Boolean).join(" | ");
      if (!detail) return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse); // không đổi gì
      if (!(await changeBooker(env.DB, id, staff.id, v, booker.write, detail))) {
        const now = await getMeta(env.DB, id);
        return now?.status === "cancelled" ? CANCELLED() : STALE();
      }
      return json({ order: (await loadOrderView(env.DB, id))! } satisfies OrderResponse);
    }),
```

- [ ] **Step 4: Chạy để thấy xanh**

Run: `npm test && npm run typecheck` — Expected: PASS (`audit-actions.test.ts` kiểm nhãn không trùng: "Đổi khách" chưa có).
Run: `npm run test:e2e -- booker permissions` — Expected: PASS, dòng cuối `E2E OK`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/audit-actions.ts src/modules/orders/repository.ts src/modules/orders/index.ts tests/e2e/booker.mjs
git commit -m "N2 lát 1: PUT /api/orders/:id/booker — đổi khách của đơn đã xác nhận

Chủ dự án quyết (ADR-0011 điều 2): khách hay đổi người phút cuối trước giờ tàu,
nên đổi khách là thông tin vận hành, cùng quyền với sửa chuyến; nhật ký ghi
'từ A sang B' bằng tên, không SĐT; đơn đã huỷ thì không."
```

---

### Task 6: Giao diện — khối "Hồ sơ khách" ở form đơn

**Files:**
- Create: `web/booker-picker.ts`
- Modify: `web/order-form.ts`, `public/order-form.html:12-17`, `public/app.css` (cuối tệp)

**Interfaces:**
- Consumes: `NO_BOOKER_TEXT`, `bookerPayload`, `canPickMatch`, `lookupReady`, `matchNote`, `type BookerChoice` (Task 1); `OrderInput.bookerPartyId/newBooker`, `OrderDto.bookerPartyId/bookerName` (Task 3, 4); `GET /api/parties/lookup`.
- Produces: `createBookerPicker(o: { name: HTMLInputElement; phone: HTMLInputElement }): BookerPicker` với `BookerPicker = { root: HTMLElement; payload(): ReturnType<typeof bookerPayload>; set(partyId: string | null, name: string | null): void }` (Task 7 dùng lại).

Không có test tự động cho DOM trong repo — luật đã phủ ở `src/shared/booker.test.ts`; kiểm hành vi bằng kịch bản Chrome (Step 4) và thử tay (Step 5).

- [ ] **Step 1: Viết khối** — `web/booker-picker.ts`:

```ts
// Khối "Hồ sơ khách" (N2 lát 1, ADR-0011) dùng ở form đơn và bảng "Đổi khách": gõ SĐT → hiện MỌI hồ sơ trùng số (ADR-0001 mục 8, bắt buộc) →
// "Dùng hồ sơ này" (chỉ cá nhân đang hoạt động) hoặc "Tạo hồ sơ mới" (tạo khi bấm Lưu, cùng lúc với đơn); không chọn gì = lưu không gắn.
// Luật và câu chữ ở src/shared/booker.ts; khối này chỉ dựng DOM và gọi GET /api/parties/lookup (máy chủ vẫn kiểm lại mọi thứ).
import { NO_BOOKER_TEXT, bookerPayload, canPickMatch, lookupReady, matchNote, type BookerChoice } from "../src/shared/booker";
import { api, type Api } from "./api";
import { h, replaceChildren } from "./dom";

export interface BookerPicker {
  root: HTMLElement;
  /** Trường gửi kèm đơn / bảng đổi khách theo lựa chọn hiện tại (đọc tên + SĐT đang gõ). */
  payload(): ReturnType<typeof bookerPayload>;
  /** Đặt lựa chọn khi mở đơn đã lưu (null = chưa gắn) rồi tra lại hồ sơ theo SĐT hiện có. */
  set(partyId: string | null, name: string | null): void;
}

export function createBookerPicker(o: { name: HTMLInputElement; phone: HTMLInputElement }): BookerPicker {
  let choice: BookerChoice = { kind: "none" };
  let seq = 0; // bỏ kết quả tra cứu cũ về muộn
  let timer: number | undefined;

  const status = h("p", { class: "booker-status", "aria-live": "polite" });
  const matches = h("div", { class: "booker-matches" });
  const root = h("div", { class: "booker" }, status, matches);

  const linkButton = (label: string, onClick: () => void): HTMLButtonElement => {
    const b = h("button", { type: "button", class: "btn btn-link" }, label);
    b.addEventListener("click", onClick);
    return b;
  };
  const choose = (next: BookerChoice): void => {
    choice = next;
    renderStatus();
  };

  function renderStatus(): void {
    if (choice.kind === "existing") replaceChildren(status, `Đã gắn hồ sơ: ${choice.name} · `, linkButton("Bỏ gắn", () => choose({ kind: "none" })));
    else if (choice.kind === "new") replaceChildren(status, "Sẽ tạo hồ sơ mới cho khách này khi lưu · ", linkButton("Không tạo nữa", () => choose({ kind: "none" })));
    else replaceChildren(status, h("span", { class: "chip chip-warn" }, NO_BOOKER_TEXT));
  }

  const newButton = (): HTMLButtonElement => {
    const b = h("button", { type: "button", class: "btn" }, "Tạo hồ sơ mới");
    b.addEventListener("click", () => {
      if (!o.name.value.trim()) {
        replaceChildren(matches, h("p", { class: "field-error" }, "Nhập tên khách trước khi tạo hồ sơ."));
        o.name.focus();
        return;
      }
      choose({ kind: "new" });
    });
    return b;
  };

  async function lookup(): Promise<void> {
    const mine = ++seq;
    if (!lookupReady(o.phone.value)) {
      replaceChildren(matches);
      return;
    }
    let found: Api.PartyListItemDto[];
    try {
      found = (await api<Api.PartyLookupResponse>(`/api/parties/lookup?phone=${encodeURIComponent(o.phone.value)}`)).matches;
    } catch {
      if (mine === seq) replaceChildren(matches, h("p", { class: "muted" }, "Không tra được hồ sơ — vẫn lưu đơn được, chỉ chưa gắn khách."));
      return;
    }
    if (mine !== seq) return;
    const rows = found.map((m) => {
      const note = matchNote(m);
      const use = canPickMatch(m)
        ? linkButton("Dùng hồ sơ này", () => {
            o.name.value = m.displayName; // điền sẵn; ô vẫn sửa được (tên trên đơn là bản chụp, không ghi ngược vào hồ sơ)
            choose({ kind: "existing", partyId: m.id, name: m.displayName });
          })
        : null;
      return h("div", { class: "booker-match" }, h("span", null, m.displayName), note ? h("span", { class: "muted" }, `(${note})`) : null, use);
    });
    replaceChildren(
      matches,
      found.length ? h("p", null, `Có ${found.length} hồ sơ dùng số này:`) : h("p", { class: "muted" }, "Chưa có hồ sơ nào dùng số này."),
      ...rows,
      h("div", { class: "booker-match" }, newButton()),
      found.length ? h("p", { class: "muted" }, "Cùng một số có thể thuộc nhiều người (người nhà, công ty) — chọn đúng người hoặc tạo hồ sơ mới.") : null,
    );
  }

  o.phone.addEventListener("input", () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => void lookup(), 400);
  });
  renderStatus();

  return {
    root,
    payload: () => bookerPayload(choice, o.name.value, o.phone.value),
    set(partyId, name) {
      choice = partyId ? { kind: "existing", partyId, name: name ?? "" } : { kind: "none" };
      renderStatus();
      void lookup();
    },
  };
}
```

- [ ] **Step 2: Nối vào form**

`public/order-form.html` — trong khối "Khách hàng", thêm ngay SAU `</div>` đóng `grid two` (trước `</section>`):
```html
        <div id="booker-slot"></div>
```

`web/order-form.ts`:
- import: `import { createBookerPicker } from "./booker-picker";`
- sau dòng `const num = …` thêm:
```ts
// Hồ sơ khách (N2 lát 1): tra theo SĐT, dùng hồ sơ có sẵn hoặc tạo mới khi lưu; không chọn = lưu không gắn (ADR-0011).
const bookerPicker = createBookerPicker({ name: field("customerName") as HTMLInputElement, phone: field("customerPhone") as HTMLInputElement });
byId("booker-slot").append(bookerPicker.root);
```
- trong `collect()`, thêm `...bookerPicker.payload(),` ngay TRƯỚC dòng `...(orderUpdatedAt ? …)`.
- trong `fill()`, thêm sau hai dòng điền tên/SĐT: `bookerPicker.set(o.bookerPartyId, o.bookerName);`.

`public/app.css` — thêm CUỐI tệp (vùng sau dấu mốc PWA: chỉ token):
```css
/* ---------- hồ sơ khách trên đơn (N2 lát 1) ---------- */
.booker { display: grid; gap: var(--s2); margin-top: var(--s3); }
.booker-matches { display: grid; gap: var(--s2); }
.booker-match { display: flex; flex-wrap: wrap; align-items: center; gap: var(--s2); }
```

- [ ] **Step 3: Build + kiểm tĩnh**

Run: `npm run build:web && npm run typecheck && npm test` — Expected: build không lỗi, tsc 0 lỗi, test xanh.
Run: `npm run test:e2e -- pwa` — Expected: PASS (quét CSS vùng PWA không có hex/px).

- [ ] **Step 4: Kịch bản Chrome (bắt buộc khi sửa `web/order-form.ts` — CLAUDE.md §3)**

Chạy ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-form.mjs`, `a2-smoke-order.mjs`, `a2-smoke-sheet.mjs` theo `tests/e2e/README.md` (cần Chrome; `CHROME_BIN`). Expected: mọi bước ✓ như trước. Không có Chrome → ghi rõ "CHƯA CHẠY kịch bản Chrome" trong báo cáo, không tuyên bố xong phần giao diện.

- [ ] **Step 5: Thử tay trên `npm run dev`**

Lập đơn: gõ SĐT của một hồ sơ có sẵn → thấy danh sách + "Dùng hồ sơ này" → lưu → trang đơn (Task 7 sẽ hiện tên hồ sơ). Gõ SĐT mới → "Tạo hồ sơ mới" → lưu → trang `/parties` có hồ sơ mới với vai Khách hàng. Không chọn gì → lưu được. Sửa nháp đã gắn → dòng "Đã gắn hồ sơ: …" hiện sẵn.

- [ ] **Step 6: Commit**

```bash
git add web/booker-picker.ts web/order-form.ts public/order-form.html public/app.css
git commit -m "N2 lát 1: khối 'Hồ sơ khách' ở form đơn (tra theo SĐT, dùng có sẵn hoặc tạo mới)

ADR-0001 mục 8 bắt buộc hiện mọi hồ sơ trùng số trước khi tạo mới. Khối dùng
chung để bảng đổi khách ở trang đơn dùng lại; luật nằm ở src/shared/booker.ts."
```

---

### Task 7: Giao diện — trang đơn hiện hồ sơ khách + bảng "Đổi khách" cho đơn đã xác nhận

**Files:**
- Create: `web/booker-sheet.ts`
- Modify: `web/order.ts` (khối "Khách hàng" trong `render`, import)

**Interfaces:**
- Consumes: `createBookerPicker` (Task 6), `NO_BOOKER_TEXT` (Task 1), `PUT /api/orders/:id/booker` (Task 5), `orderActions(...).editTrip` (`src/shared/order-view.ts`).
- Produces: `openBookerSheet(o: { order: Order; onSaved: () => void; onReload: () => void }, opener: HTMLElement): void`.

- [ ] **Step 1: Viết bảng** — `web/booker-sheet.ts` (cùng khuôn modal với `web/trip-sheet.ts`: role=dialog, nền `inert`, Esc/✕/chạm nền để đóng, không đóng khi đang lưu, trả focus):

```ts
// Bảng "Đổi khách" (N2 lát 1, ADR-0011 điều 2) — cho đơn ĐÃ XÁC NHẬN (đơn nháp đổi khách trong form). Tên + SĐT trên đơn + khối "Hồ sơ khách";
// lưu bằng PUT /api/orders/:id/booker (khoá lạc quan theo `updatedAt`). Khuôn modal như web/trip-sheet.ts.
import { ApiError, api, type Order } from "./api";
import { renderBanner } from "./banner";
import { createBookerPicker } from "./booker-picker";
import { h } from "./dom";
import { vnd } from "./format";
import { icon } from "./icons";
import { NETWORK_BANNER, banner, classifyOrderError, type Banner } from "../src/shared/order-errors";

export interface BookerSheetOptions {
  order: Order;
  /** Lưu thành công: bảng đã đóng; nơi gọi tải lại đơn. */
  onSaved: () => void;
  /** Nút "Tải lại đơn" trong banner: bảng đã đóng; nơi gọi tải lại đơn. */
  onReload: () => void;
}

export function openBookerSheet(o: BookerSheetOptions, opener: HTMLElement): void {
  let saving = false;
  const nameInput = h("input", { type: "text", maxLength: 200, autocomplete: "off", value: o.order.customerName });
  const phoneInput = h("input", { type: "tel", inputMode: "tel", maxLength: 30, autocomplete: "off", value: o.order.customerPhone });
  const picker = createBookerPicker({ name: nameInput, phone: phoneInput });
  picker.set(o.order.bookerPartyId, o.order.bookerName);

  const bannerEl = h("div", { class: "banner", role: "alert", hidden: true });
  const saveBtn = h("button", { type: "button", class: "btn btn-primary btn-block" }, "Lưu khách");
  const closeBtn = h("button", { type: "button", class: "btn btn-link sheet-close", "aria-label": "Đóng" }, icon("close", 20));
  const scrim = h("div", { class: "sheet-scrim" });

  const dialog = h(
    "div",
    { class: "sheet", role: "dialog", "aria-modal": "true", "aria-labelledby": "booker-sheet-title", tabindex: -1 },
    h("div", { class: "sheet-head" }, h("h2", { id: "booker-sheet-title", class: "sheet-title" }, "Đổi khách"), closeBtn),
    h(
      "div",
      { class: "sheet-body" },
      h("p", { class: "sheet-warn" }, icon("alert", 18), "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại."),
      bannerEl,
      h("label", null, "Tên khách *", nameInput),
      h("label", null, "Số điện thoại *", phoneInput),
      picker.root,
    ),
    h("div", { class: "sheet-foot" }, saveBtn),
  );
  const root = h("div", { class: "sheet-root" }, scrim, dialog);

  const background = [...document.body.children];
  const requestClose = (): void => {
    if (!saving) close();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") requestClose();
  };
  function close(restoreFocus = true): void {
    document.removeEventListener("keydown", onKey);
    for (const el of background) el.removeAttribute("inert");
    document.body.classList.remove("sheet-open");
    root.remove();
    if (restoreFocus && opener.isConnected) opener.focus();
  }

  const errorBanner = (err: unknown): Banner => {
    if (!(err instanceof ApiError)) return NETWORK_BANNER;
    const b = classifyOrderError({ status: err.status, code: err.code, message: err.message, details: err.details }, { serviceNames: o.order.services.map((s) => s.name), formatMoney: vnd });
    return b.action === "lock_form" ? { ...b, action: "reload_order" } : b;
  };

  async function save(): Promise<void> {
    if (saving) return;
    if (!nameInput.value.trim() || !phoneInput.value.trim()) {
      renderBanner(bannerEl, banner("danger", "Nhập tên và số điện thoại khách."));
      return;
    }
    saving = true;
    saveBtn.disabled = true;
    saveBtn.textContent = "Đang lưu…";
    renderBanner(bannerEl, null);
    try {
      await api(`/api/orders/${encodeURIComponent(o.order.id)}/booker`, {
        method: "PUT",
        body: { customerName: nameInput.value, customerPhone: phoneInput.value, ...picker.payload(), expectedUpdatedAt: o.order.updatedAt },
      });
      close(false);
      o.onSaved();
    } catch (err) {
      saving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "Lưu khách";
      renderBanner(bannerEl, errorBanner(err), {
        reloadOrder: () => {
          close(false);
          o.onReload();
        },
        reloadPage: () => location.reload(),
      });
      bannerEl.scrollIntoView({ block: "nearest" });
    }
  }

  saveBtn.addEventListener("click", () => void save());
  closeBtn.addEventListener("click", requestClose);
  scrim.addEventListener("click", requestClose);
  document.addEventListener("keydown", onKey);

  document.body.append(root);
  for (const el of background) el.setAttribute("inert", "");
  document.body.classList.add("sheet-open");
  dialog.focus();
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add("open")));
}
```

- [ ] **Step 2: Trang đơn** — `web/order.ts`:
- import: `import { openBookerSheet } from "./booker-sheet";` và `import { NO_BOOKER_TEXT } from "../src/shared/booker";`
- thay dòng khối "Khách hàng" trong `render`:
```ts
    h(
      "section",
      { class: "card" },
      h("h2", null, "Khách hàng"),
      kv("Tên", order.customerName),
      kv("Số điện thoại", order.customerPhone),
      kv("Email", order.customerEmail),
      kv("Ghi chú", order.customerNote),
      kv("Hồ sơ khách", order.bookerName ?? NO_BOOKER_TEXT),
      a.editTrip ? bookerButton(order) : null,
    ),
```
- thêm hàm (cạnh `editTripButton`):
```ts
const focusChangeBooker = (): void => document.querySelector<HTMLElement>('[data-action="change-booker"]')?.focus();

/** Đơn đã xác nhận: mở bảng "Đổi khách" (ADR-0011 điều 2 — cùng điều kiện hiện nút với "Sửa thông tin chuyến"). Đơn nháp đổi khách trong form. */
function bookerButton(order: Order): HTMLButtonElement {
  const btn = h("button", { type: "button", class: "btn", "data-action": "change-booker" }, "Đổi khách");
  btn.addEventListener("click", () =>
    openBookerSheet(
      {
        order,
        onSaved: () =>
          void load().then(() => {
            if (bannerEl.hidden) show(banner("info", "Đã đổi khách."));
            focusChangeBooker();
          }),
        onReload: () => void load().then(focusChangeBooker),
      },
      btn,
    ),
  );
  return btn;
}
```

- [ ] **Step 3: Build + kiểm tĩnh**

Run: `npm run build:web && npm run typecheck && npm test` — Expected: không lỗi.

- [ ] **Step 4: Kịch bản Chrome (bắt buộc khi sửa `web/order.ts` — CLAUDE.md §3)**

Chạy lại ba `a2-smoke-*.mjs` và `docs/evidence/2026-09-21-v1-0/kich-ban/v1-nguoi-phu-trach.mjs` (người phụ trách đọc trang đơn). Expected: mọi bước ✓. Không có Chrome → ghi "CHƯA CHẠY" trong báo cáo.

- [ ] **Step 5: Thử tay trên `npm run dev`**

Đơn đã xác nhận: thấy "Hồ sơ khách: …" và nút "Đổi khách" → đổi sang hồ sơ khác → banner "Đã đổi khách.", tên mới hiện, "Lịch sử" có "Đổi khách". Mở cùng đơn ở hai tab, đổi ở tab 1 rồi đổi ở tab 2 → banner lỗi "Đơn vừa được người khác sửa" + "Tải lại đơn". Đơn nháp: KHÔNG có nút "Đổi khách" (đổi trong form). Tài khoản kế toán: không có nút.

- [ ] **Step 6: Commit**

```bash
git add web/booker-sheet.ts web/order.ts
git commit -m "N2 lát 1: trang đơn hiện hồ sơ khách và bảng 'Đổi khách' cho đơn đã xác nhận

Khách đổi người phút cuối (ADR-0011 điều 2) mà đơn đã xác nhận thì form bị khoá;
bảng riêng dùng lại khối Hồ sơ khách và route PUT /booker có khoá lạc quan."
```

---

### Task 8: Tài liệu, kiểm toàn bộ, runbook triển khai

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (§5 mô hình dữ liệu `orders`, §7 danh mục API, §8 phân quyền), `docs/CHANGE-GUIDE.md` (bẫy bind theo vị trí nay có `booker_party_id`), `docs/HANDOFF-N1.md` (runbook "Lần phát hành kế tiếp: `0018` + mã N2 lát 1"), `CLAUDE.md` (§3 số test, §9 hiện trạng + e2e 16 kịch bản), `tests/e2e/README.md` (danh sách kịch bản nếu có liệt kê), `docs/superpowers/specs/2026-09-21-n2-lat-1-khach-tren-don.md` (trạng thái: "đã thi công, chưa lên production"; ghi hai mục "Lệch đặc tả có chủ ý" của kế hoạch này)

- [ ] **Step 1: Cập nhật tài liệu** — nội dung bắt buộc:
- SYSTEM-DESIGN §5: `orders.booker_party_id` (NULL được, FK `pty_party`, chỉ mục; đọc tên qua `v_pty_party_label`); §7: `PUT /api/orders/:id/booker` (office; `order.trip.edit`; nháp hoặc đã xác nhận; 400/403/404/409 `stale`/`not_editable`), `POST/PUT /api/orders` nhận `bookerPartyId` | `newBooker`, `OrderDto` có `bookerPartyId`, `bookerName`; §8: nhắc ngoại lệ ADR-0011 (tạo hồ sơ + vai CUSTOMER khi lập/sửa đơn).
- HANDOFF-N1: runbook cho lần phát hành này — **khác `0017`: có đổi mã nên PHẢI `wrangler deploy` ngay sau khi áp migration**. Trình tự: cổng chỉ-đọc (`migrations list --remote` chỉ còn `0018_orders_booker_party`), `audit-invariants --db remote`, điểm Time Travel, `npm test` + `typecheck` + `test:e2e` xanh, `db:migrate:remote` rồi `wrangler deploy` NGAY (mã cũ vẫn chạy được với cột mới vì chỉ `SELECT o.*`), kiểm sau deploy (`/order-form` 200, lập một đơn thử KHÔNG bắt buộc — là thao tác ghi thật), ghi trạng thái. Hoàn tác: lùi Worker về bản trước là an toàn (cột thừa không ảnh hưởng mã cũ); không gỡ cột (không xoá dữ liệu).
- CLAUDE.md §9: N2 lát 1 đã thi công trên nhánh, `0018` có trong repo, CHƯA lên production; e2e 16 kịch bản (thêm `booker`).

- [ ] **Step 2: Kiểm toàn bộ**

Run: `npm test && npm run typecheck && npm run build:web && npm run test:e2e`
Expected: test xanh (ghi số test thật vào CLAUDE.md §3), tsc 0 lỗi, e2e 16/16 kịch bản + `audit-invariants` xanh.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/ tests/e2e/README.md
git commit -m "N2 lát 1: tài liệu, runbook triển khai 0018 + mã (cần deploy ngay sau migration)

Khác 0017, lần này có đổi mã nên runbook ghi rõ áp migration rồi deploy ngay;
hoàn tác bằng lùi Worker là an toàn vì mã cũ không đọc cột mới."
```

---

## Việc KHÔNG thuộc kế hoạch này (chờ người)

- Chủ dự án hỏi ý một nhân viên bán hàng về bước thêm khi lập đơn và về đơn qua đại lý (đặc tả §12 bước 2) — nên làm trước khi triển khai; kết quả có thể đổi giao diện Task 6, không đổi máy chủ.
- Truy vấn thước đo §10 của đặc tả trên D1 production (chỉ đọc, cần chủ dự án cho phép).
- Triển khai lên production theo runbook ở Task 8 — chỉ khi chủ dự án ra lệnh.
- Lát 2 (backfill đơn cũ, gộp hồ sơ, siết bắt buộc, `traveller_party_id`, ô "Đại lý") — cần ADR riêng.
