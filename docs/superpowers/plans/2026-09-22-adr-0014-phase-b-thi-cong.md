# ADR-0014 Phase B (phần huỷ đơn) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép tài khoản chỉ giữ quyền `FIELD` (Thực hiện), đang là người phụ trách một đơn đã xác nhận, huỷ đơn đó qua một route hẹp riêng, kèm lý do bắt buộc từ danh sách đóng đúng hai lựa chọn — đúng ADR-0014 điều 11. Đồng thời mở `checkAssignee` (điều kiện "đủ tư cách làm người phụ trách") để chấp nhận `FIELD` ở cấp hẹp, vì hôm nay route đặt người phụ trách chặn thẳng mọi tài khoản không có `order.modify` phạm vi `assigned` — nếu không mở, không ai gán được `FIELD` làm người phụ trách để thử route huỷ.

**Phạm vi bị loại khỏi kế hoạch này:** phần "sửa số khách/dịch vụ/tiền sau xác nhận" (`order.money.edit`, điều 6) của Phase B — bị chặn bởi một xung đột kiến trúc chưa được chủ dự án quyết (trigger `order_service_frozen_*` của migration `0008` chặn thật hôm nay; cơ chế nới trigger mà ADR-0007 gợi ý không chạy được trên SQLite như đã viết). Xem `docs/superpowers/specs/2026-09-22-dong-dieu-chinh-sau-xac-nhan-cau-hoi.md`. Kế hoạch này **không đụng** `order_service`, `order_item`, hay bất kỳ cột tiền nào của `orders` — chỉ đổi `orders.status`/`updated_at`, giống hệt cách huỷ đơn hôm nay của `SALES`/`ADMIN`.

**Architecture:** Route mới `POST /api/orders/:id/handler-cancel` đăng ký ở module `dispatch` (không phải `orders` — ADR-0007 điều 4(c): `FIELD` không dùng `/api/orders*`), theo đúng khuôn `PUT /api/orders/:id/handler` đã có (route đơn nằm trong module `dispatch`, gọi hàm ghi dữ liệu do `orders/index.ts` xuất ra vì chỉ module chủ được ghi bảng của mình). Máy chủ kiểm quyền bằng `can(staff, "order.cancel", { assigned })` (ô `MATRIX` đã có sẵn từ Phase A, không đổi). Ghi nhật ký bằng một hành động mới (`order_cancelled_by_field`) để kế toán lọc được đơn cần chú ý hoàn cọc qua `order.history.view` đã có sẵn — không cần bảng hay cột mới (đúng điều 11: "không cần bảng 'dòng điều chỉnh'").

**Tech Stack:** TypeScript, Cloudflare Workers/D1, `node --test`, kịch bản e2e thật (`tests/e2e/dispatch.mjs`) qua `wrangler dev` cục bộ.

**Spec:** `docs/adr/ADR-0014-tai-khoan-doi-tac-super-admin-va-sua-sau-xac-nhan.md` điều 6 (đoạn 3, mở `checkAssignee`) và điều 11 (toàn bộ); `docs/superpowers/specs/2026-09-22-tai-khoan-doi-tac-super-admin.md` §3 tiêu chí 10–11; `docs/HANDOFF-ADR-0014-PHASE-BCD.md` mục 2 (Phase B, hai gạch đầu: `order.cancel`, mở `checkAssignee`).

## Global Constraints

- Ngôn ngữ: mọi thông báo lỗi, nhãn nhật ký, commit đều tiếng Việt có dấu (CLAUDE.md §7).
- Tiền: route này **không đụng** bất kỳ cột tiền nào (`subtotal`, `discount`, `total`, `deposit_amount`, `deposit_method`, `remaining_amount`) hay bảng `order_item`/`order_service` — chỉ `orders.status`/`updated_at` (ADR-0014 điều 11).
- Không xoá cứng, không sửa migration đã áp — kế hoạch này **không cần migration mới** (không đổi schema).
- Mặc định từ chối: route mới dùng `access: "staff"` (mọi tài khoản đăng nhập) rồi tự gọi `can()` bên trong handler — đúng khuôn các route hẹp khác.
- Vai trò hồ sơ (HDV, tài xế…) không bao giờ là điều kiện cho phép.
- Nhật ký không ghi SĐT/email/MST.
- TDD: mỗi hành vi mới viết test đỏ trước, xanh sau; mỗi task một commit.
- Việc lớn (đụng quyền + dữ liệu đơn): sau khi xong TOÀN BỘ kế hoạch này, bắt buộc một subagent kiểm độc lập, chỉ đọc, trước khi báo "đạt" (CLAUDE.md §3, N8) — người thi công không tự báo đạt thay người kiểm.

---

## Task 1: Mở `checkAssignee` cho `FIELD` (cấp hẹp — ADR-0014 điều 6)

**Files:**
- Modify: `src/modules/dispatch/rules.ts` (hàm `checkAssignee`, dòng 44–50 hiện tại)
- Modify: `src/modules/dispatch/rules.test.ts` (test hiện có cho `checkAssignee`, dòng ~50–77)
- Modify: `tests/e2e/dispatch.mjs` (mục 3 — `GET /api/dispatch/assignees`, dòng ~83–90)

**Interfaces:**
- Consumes: `can(who, op, ctx)` từ `src/shared/permissions.ts` (đã có, không đổi) — ô `order.money.edit` với `FIELD = "assigned"` đã có sẵn từ Phase A.
- Produces: `checkAssignee(who: AssigneeCandidate | null): Parsed<{ partyId: string; name: string }>` — chữ ký KHÔNG đổi, chỉ hành vi bên trong đổi. Task 3 không phụ thuộc trực tiếp hàm này (route huỷ tự gọi `can()` riêng), nhưng Task 3 CẦN một tài khoản `FIELD` gán được làm người phụ trách qua `PUT /api/orders/:id/handler` — route đó gọi `checkAssignee` — nên Task 1 phải xong trước Task 3's kịch bản e2e.

- [ ] **Step 1: Sửa test trước (đỏ) — thêm ca chấp nhận FIELD, bớt FIELD khỏi ca từ chối, sửa thông điệp kỳ vọng**

Trong `src/modules/dispatch/rules.test.ts`, thay khối từ dòng có `test("người được giao: SALES hoặc ADMIN...` đến hết `test("mọi quyền hiện có...")` (đến trước dòng `// --- Ai được đặt/đổi người phụ trách`) bằng:

```ts
test("người được giao: SALES hoặc ADMIN đang hoạt động có hồ sơ; kể cả có thêm quyền khác", () => {
  for (const perms of [["SALES"], ["ADMIN"], ["SALES", "ADMIN"], ["ACCOUNTING", "SALES"], ["FIELD", "ADMIN"]] as PermissionCode[][]) {
    assert.deepEqual(checkAssignee(account(perms)), { ok: true, partyId: "pty-1", name: "Nguyễn Thị Hoa" }, perms.join("+"));
  }
});

test("người được giao: FIELD đang hoạt động có hồ sơ cũng đủ điều kiện — cấp hẹp (ADR-0014 điều 6, đoạn 3)", () => {
  for (const perms of [["FIELD"], ["ACCOUNTING", "FIELD"]] as PermissionCode[][]) {
    assert.deepEqual(checkAssignee(account(perms)), { ok: true, partyId: "pty-1", name: "Nguyễn Thị Hoa" }, perms.join("+"));
  }
});

test("người được giao: chỉ kế toán, không quyền nào, đã ngưng, chưa có hồ sơ, không tồn tại → từ chối kèm lý do tiếng Việt", () => {
  const cases: [ReturnType<typeof account> | null, RegExp][] = [
    [account(["ACCOUNTING"]), /Bán hàng, Quản trị hoặc Thực hiện/],
    [account([]), /Bán hàng, Quản trị hoặc Thực hiện/],
    [account(["SALES"], { active: false }), /ngưng hoạt động/],
    [account(["ADMIN"], { partyId: null }), /chưa có hồ sơ/],
    [null, /Không tìm thấy/],
  ];
  for (const [who, re] of cases) {
    const r = checkAssignee(who);
    assert.ok(!r.ok && re.test(r.message), `${JSON.stringify(who)} → ${JSON.stringify(r)}`);
  }
});

test("mọi quyền hiện có được xếp vào đúng nhóm được giao / không được giao (một nguồn: ô order.modify/order.money.edit của bản đồ quyền)", () => {
  const eligible = PERMISSION_CODES.filter((p) => checkAssignee(account([p])).ok);
  // ADR-0014 điều 2: SUPER_ADMIN = any ở MỌI thao tác. ADR-0014 điều 6: FIELD đủ điều kiện cấp hẹp qua order.money.edit=assigned (Phase B).
  // PARTNER (own, không phải assigned) CHƯA đủ điều kiện — cấp thứ ba của PARTNER (điều 10) là Phase C, không phải checkAssignee.
  assert.deepEqual(eligible, ["SALES", "ADMIN", "FIELD", "SUPER_ADMIN"], "thêm mã quyền mới thì phải quyết định nó có được giao phụ trách không");
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `node --test src/modules/dispatch/rules.test.ts`
Expected: FAIL — các ca `FIELD` mới kỳ vọng `ok: true` nhưng mã hiện tại còn trả `ok: false` (thông điệp cũ "Bán hàng hoặc Quản trị"); ca đối chiếu tripwire kỳ vọng `["SALES", "ADMIN", "FIELD", "SUPER_ADMIN"]` nhưng mã hiện tại trả `["SALES", "ADMIN", "SUPER_ADMIN"]`.

- [ ] **Step 3: Sửa `checkAssignee`**

Trong `src/modules/dispatch/rules.ts`, thay hàm `checkAssignee` (và cập nhật đoạn chú thích ngay phía trên nó) bằng:

```ts
/**
 * Người được giao phụ trách (ADR-0009 điều 5, mở rộng ADR-0014 điều 6): nhân sự ĐANG HOẠT ĐỘNG, CÓ HỒ SƠ, và có quyền để người phụ trách luôn SỬA/HUỶ ĐƯỢC
 * ÍT NHẤT MỘT VIỆC của người phụ trách — hỏi thẳng bản đồ quyền với phạm vi "được giao", chấp nhận MỘT trong hai cấp: `order.modify` phạm vi `assigned`
 * (cấp đầy đủ — SALES/ADMIN hôm nay, hỏi qua `can()` như cũ) HOẶC `order.money.edit` mà Ô CHÍNH XÁC của quyền đó là `assigned` (cấp hẹp — FIELD, Phase B).
 * Cố ý đọc thẳng Ô của `MATRIX` (không dùng `can(..., "order.money.edit", { assigned: true })`): `can()` hợp NHIỀU quyền và ACCOUNTING/SUPER_ADMIN có ô
 * `order.money.edit = any` (sửa tiền MỌI đơn, không cần đang phụ trách) — nếu chỉ hỏi `can()`, ACCOUNTING sẽ lọt qua thành "đủ điều kiện làm người phụ
 * trách" dù ADR không hề nói vậy (họ sửa được tiền, không có nghĩa họ là một CẤP người phụ trách). Đổi ô nào thì luật này đổi theo, không cần sửa ở đây.
 * Không giao cho tài khoản chỉ kế toán hoặc không quyền nào. Vai trò hồ sơ (HDV, tài xế…) KHÔNG là điều kiện (ADR-0001 mục 4).
 * CỐ Ý CHƯA nhận `task.progress` (cấp thứ ba của PARTNER, ADR-0014 điều 10): việc đó cần thêm luật "chỉ qua duyệt yêu cầu đang chờ" ở `mayChangeHandler`
 * cùng lúc (Phase C) — nếu chỉ mở ở đây mà chưa có luật đó, một SALES gán thẳng được một PARTNER chưa từng xin việc, phá đúng điều 10 cấm.
 */
export function checkAssignee(who: AssigneeCandidate | null): Parsed<{ partyId: string; name: string }> {
  if (!who) return { ok: false, message: "Không tìm thấy nhân viên được chọn." };
  if (!who.active) return { ok: false, message: "Nhân viên này đã ngưng hoạt động, không thể giao phụ trách." };
  if (!who.partyId) return { ok: false, message: "Nhân viên này chưa có hồ sơ, không thể giao phụ trách." };
  const narrowTier = who.permissions.some((p) => MATRIX["order.money.edit"][p] === "assigned");
  const eligible = can(who, "order.modify", { assigned: true }) || narrowTier;
  if (!eligible) return { ok: false, message: "Chỉ giao phụ trách cho người có quyền Bán hàng, Quản trị hoặc Thực hiện." };
  return { ok: true, partyId: who.partyId, name: who.fullName };
}
```

Nhớ đổi import ở đầu `rules.ts` (dòng 4): `import { can, MATRIX, type PermissionHolder } from "../../shared/permissions.ts";`.

**Bẫy đã bắt được lúc viết plan này bằng chính bước 4 (chạy test): bản đầu dùng `can(who, "order.money.edit", { assigned: true })` thay vì đọc thẳng ô — `can()` hợp NHIỀU quyền nên trả `true` cho ACCOUNTING (ô của họ là `any`, không phải `assigned`, nhưng `any` cũng đi qua `allows()` bất kể `ctx.assigned`). Test `chỉ kế toán → từ chối` đỏ đúng lúc đó, lộ ra lỗi trước khi merge. Dùng bản trong khối mã trên (đọc thẳng `MATRIX`), không dùng bản `can()` trần.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `node --test src/modules/dispatch/rules.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Chạy toàn bộ test thuần + typecheck**

Run: `npm test && npm run typecheck`
Expected: PASS, 0 lỗi.

- [ ] **Step 6: Sửa kịch bản e2e — FIELD nay CÓ trong danh sách assignees VÀ gán được**

Trong `tests/e2e/dispatch.mjs`, mục 3 (`GET /api/dispatch/assignees`), thay:

```js
for (const [label, who] of [["kế toán", acc], ["FIELD", fld], ["đã ngưng", D]]) assert.ok(!ids.includes(who.id), `${label} không được có trong danh sách`);
```

bằng:

```js
for (const [label, who] of [["kế toán", acc], ["đã ngưng", D]]) assert.ok(!ids.includes(who.id), `${label} không được có trong danh sách`);
assert.ok(ids.includes(fld.id), "FIELD nay đủ điều kiện làm người phụ trách cấp hẹp (ADR-0014 điều 6) nên phải có trong danh sách");
```

**Còn một chỗ khác cũng phải sửa (bắt được lúc chạy e2e lần đầu, không có trong bản kế hoạch gốc):** mục 7 (`for (const [label, target] of [["FIELD", fld.id], ["kế toán", acc.id]...`, kiểm `PUT /api/orders/:id/handler` trả 400 `invalid_assignee`) — bớt `["FIELD", fld.id]` khỏi danh sách bị từ chối (đổi tiêu đề chú thích mục 7 thành "SALES/ADMIN/FIELD"), và thêm một ca dương riêng trên một đơn MỚI (không dùng `o1` — các dòng ngay sau mục 7 kiểm `o1` "bị từ chối thì không đổi gì" dựa vào `stableRows`, nếu gán FIELD thành công trên `o1` sẽ phá đúng phép kiểm đó):

```js
const oFieldAssignee = await newOrder(A);
r = await setHandler(A, oFieldAssignee.id, fld.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(await handlerOf(A, oFieldAssignee.id), asDto(fld));
console.log("✓ FIELD nay gán được làm người phụ trách (ADR-0014 điều 6, cấp hẹp)");
```

- [ ] **Step 7: Chạy e2e dispatch, xác nhận xanh**

Run: `npm run test:e2e -- dispatch`
Expected: kịch bản `dispatch` PASS (bao gồm mục 3 vừa sửa).

- [ ] **Step 8: Commit**

```bash
git add src/modules/dispatch/rules.ts src/modules/dispatch/rules.test.ts tests/e2e/dispatch.mjs
git commit -m "$(cat <<'EOF'
Mở checkAssignee cho FIELD cấp hẹp (ADR-0014 điều 6)

FIELD đang hoạt động có hồ sơ nay đủ điều kiện làm người phụ trách qua
order.money.edit phạm vi assigned, cạnh order.modify đã có của SALES/ADMIN.
Cần trước khi route huỷ đơn của FIELD (điều 11) có ai để thử, vì
PUT /api/orders/:id/handler vẫn chặn mọi tài khoản checkAssignee từ chối.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Lý do huỷ đóng (danh sách hai lựa chọn — ADR-0014 điều 11)

**Files:**
- Modify: `src/modules/dispatch/rules.ts` (thêm hằng số + hàm thuần, không sửa hàm đã có)
- Modify: `src/modules/dispatch/rules.test.ts` (thêm test mới)

**Interfaces:**
- Produces: `CANCEL_REASONS: readonly ["not_reachable", "customer_requested"]`, `type CancelReason`, `CANCEL_REASON_LABEL: Record<CancelReason, string>`, `parseCancelReason(body: Record<string, unknown> | null): Parsed<{ reason: CancelReason }>`. Task 3 dùng `CANCEL_REASON_LABEL[reason]` làm `detail` của dòng nhật ký, và `parseCancelReason` để kiểm thân yêu cầu của route.

- [ ] **Step 1: Viết test trước (đỏ)**

Thêm vào cuối `src/modules/dispatch/rules.test.ts` (sau khối test của `checkAssignee`, trước `// --- Ai được đặt/đổi người phụ trách`):

```ts
// --- Lý do huỷ đơn của FIELD (ADR-0014 điều 11) -------------------------------------------------------------------------
test("lý do huỷ: đúng một trong hai mã đóng", () => {
  assert.deepEqual(parseCancelReason({ reason: "not_reachable" }), { ok: true, reason: "not_reachable" });
  assert.deepEqual(parseCancelReason({ reason: "customer_requested" }), { ok: true, reason: "customer_requested" });
});

test("lý do huỷ: thiếu, sai kiểu, tự do, hoặc ngoài danh sách đóng → từ chối, thông điệp nêu cả hai lựa chọn hợp lệ", () => {
  for (const body of [null, {}, { reason: "" }, { reason: "khác" }, { reason: 1 }, { reason: "Không liên hệ được với khách" }, { reason: "NOT_REACHABLE" }]) {
    const r = parseCancelReason(body as Record<string, unknown> | null);
    assert.ok(!r.ok && /Không liên hệ được với khách/.test(r.message) && /Khách yêu cầu huỷ/.test(r.message), JSON.stringify(body));
  }
});
```

Và thêm `CANCEL_REASON_LABEL, parseCancelReason` vào danh sách import ở dòng 4 (import từ `./rules.ts`).

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `node --test src/modules/dispatch/rules.test.ts`
Expected: FAIL — `parseCancelReason`/`CANCEL_REASON_LABEL` chưa tồn tại (lỗi import/undefined).

- [ ] **Step 3: Cài đặt**

Thêm vào `src/modules/dispatch/rules.ts`, ngay sau hàm `checkAssignee` (trước mục "Ai được đặt/đổi người phụ trách"):

```ts
/** Lý do huỷ đơn của FIELD qua route hẹp (ADR-0014 điều 11) — danh sách ĐÓNG, đúng nguyên văn câu trả lời của chủ dự án, không thêm/bớt. */
export const CANCEL_REASONS = ["not_reachable", "customer_requested"] as const;
export type CancelReason = (typeof CANCEL_REASONS)[number];
export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  not_reachable: "Không liên hệ được với khách",
  customer_requested: "Khách yêu cầu huỷ",
};
const isCancelReason = (v: unknown): v is CancelReason => typeof v === "string" && (CANCEL_REASONS as readonly string[]).includes(v);

/** Thân `POST /api/orders/:id/handler-cancel`: `{ reason }`. */
export function parseCancelReason(body: Record<string, unknown> | null): Parsed<{ reason: CancelReason }> {
  const reason = body?.reason;
  if (!isCancelReason(reason)) return { ok: false, message: `Lý do huỷ phải là một trong: "${CANCEL_REASON_LABEL.not_reachable}", "${CANCEL_REASON_LABEL.customer_requested}".` };
  return { ok: true, reason };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `node --test src/modules/dispatch/rules.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: `npm test && npm run typecheck`**

Expected: PASS, 0 lỗi.

- [ ] **Step 6: Commit**

```bash
git add src/modules/dispatch/rules.ts src/modules/dispatch/rules.test.ts
git commit -m "$(cat <<'EOF'
Thêm lý do huỷ đóng (hai lựa chọn) cho route huỷ đơn của FIELD

Luật thuần, chưa gắn route (Task 3). Danh sách đúng nguyên văn câu trả lời
chủ dự án (đặc tả ngắn ADR-0014 §4.5 câu 4) — không tự thêm lựa chọn khác.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Route `POST /api/orders/:id/handler-cancel`

**Files:**
- Modify: `src/shared/audit-actions.ts` (thêm một hành động)
- Modify: `src/modules/orders/repository.ts` (mở rộng `cancelOrder`)
- Modify: `src/modules/orders/index.ts` (đổi kiểu trả của `findOrderOwner`, thêm hàm xuất `cancelOrderByHandler`)
- Modify: `src/shared/contracts.ts` (thêm `HandlerCancelResponse`)
- Modify: `src/modules/dispatch/index.ts` (route mới — `audit/index.ts` đã xuất sẵn `AuditAction`, không cần sửa module `audit`)
- Modify: `tests/e2e/dispatch.mjs` (kịch bản mới)

**Interfaces:**
- Consumes: `can` từ `src/shared/permissions.ts`; `CANCEL_REASON_LABEL`, `parseCancelReason` từ `./rules.ts` (Task 2); `ctx.isAssigned`, `ctx.staff` từ router (đã có).
- Produces: `findOrderOwner(db, id): Promise<{ staffId: string; status: OrderStatus; updatedAt: string } | null>` (thêm trường `updatedAt`, không đổi trường cũ); `cancelOrderByHandler(db, id, staffId, prevUpdatedAt, reasonLabel): Promise<boolean>` (từ `orders/index.ts`); `HandlerCancelResponse { ok: true }` (từ `contracts.ts`).

- [ ] **Step 1: Viết kịch bản e2e trước (đỏ)**

Thêm vào cuối `tests/e2e/dispatch.mjs` (đọc hết tệp trước để nối đúng chỗ — sau mục cuối cùng đang có, giữ đúng phong cách `console.log("✓ ...")` của các mục trước):

```js
// --- N) POST /api/orders/:id/handler-cancel: FIELD huỷ đơn đang phụ trách, lý do đóng, không đổi cột tiền (ADR-0014 điều 11)
const handlerCancel = (cookie, orderId, body) => call(cookie, "POST", `/api/orders/${orderId}/handler-cancel`, body);
const orderMoney = async (orderId) => (await sqlRows(`SELECT status, subtotal, total, deposit_amount FROM orders WHERE id = '${orderId}'`))[0];

// Đơn nháp: FIELD chưa là người phụ trách (mặc định là A, người lập) → 403; gán rồi thử huỷ khi CÒN NHÁP → 409 (route chỉ nhận đơn đã xác nhận).
const o10 = await newOrder(A);
r = await handlerCancel(FIELD, o10.id, { reason: "customer_requested" });
assert.equal(r.status, 403, JSON.stringify(r.body));
console.log("✓ FIELD không phải người phụ trách → 403");

assert.equal((await setHandler(A, o10.id, fld.id)).status, 200);
r = await handlerCancel(FIELD, o10.id, { reason: "customer_requested" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "not_editable");
console.log("✓ đơn nháp (chưa xác nhận) → 409, chưa huỷ được qua đường này");

// Đơn xác nhận được (orderInput() mặc định đã có departDate/pax hợp lệ — xác nhận thẳng, không cần chỉnh chuyến): xác nhận, gán FIELD, thử lý do sai rồi lý do đúng.
const o11 = await newOrder(A);
assert.equal((await call(A, "POST", `/api/orders/${o11.id}/status`, { status: "confirmed" })).status, 200);
assert.equal((await setHandler(A, o11.id, fld.id)).status, 200);

r = await handlerCancel(FIELD, o11.id, {});
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_input");
console.log("✓ thiếu lý do → 400");

r = await handlerCancel(FIELD, o11.id, { reason: "vì tôi thích vậy" });
assert.equal(r.status, 400);
console.log("✓ lý do ngoài danh sách đóng → 400");

r = await handlerCancel(A, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 403, JSON.stringify(r.body));
console.log("✓ SALES (không dùng route này, dù là người lập) → 403");

const beforeMoney = await orderMoney(o11.id);
r = await handlerCancel(FIELD, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { ok: true });
const afterMoney = await orderMoney(o11.id);
assert.equal(afterMoney.status, "cancelled");
assert.deepEqual([afterMoney.subtotal, afterMoney.total, afterMoney.deposit_amount], [beforeMoney.subtotal, beforeMoney.total, beforeMoney.deposit_amount], "huỷ không đổi cột tiền");
const h11 = await history(A, o11);
const entry = h11.find((x) => x.action === "order_cancelled_by_field");
assert.ok(entry, "phải có dòng nhật ký riêng cho huỷ qua đường FIELD");
assert.match(entry.detail ?? "", /Khách yêu cầu huỷ/);
console.log("✓ FIELD đang phụ trách huỷ đơn đã xác nhận, đúng lý do → 200, không đổi tiền, có dòng nhật ký riêng cho kế toán");

r = await handlerCancel(FIELD, o11.id, { reason: "customer_requested" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "not_editable", "đơn đã huỷ rồi, không huỷ lại được");
console.log("✓ huỷ đơn đã huỷ rồi → 409");

r = await handlerCancel(FIELD, "00000000-0000-4000-8000-000000000000", { reason: "customer_requested" });
assert.equal(r.status, 404);
console.log("✓ đơn không tồn tại → 404");
```

- [ ] **Step 2: Chạy kịch bản, xác nhận đỏ**

Run: `npm run test:e2e -- dispatch`
Expected: FAIL — `POST /api/orders/:id/handler-cancel` chưa tồn tại (404 not_found ở router thay vì các mã kỳ vọng), hoặc lỗi khác cho thấy route chưa có.

- [ ] **Step 3: Thêm hành động nhật ký**

Trong `src/shared/audit-actions.ts`, thêm một dòng vào `AUDIT_ACTIONS` (nhóm `order`, ngay sau `cancelled`):

```ts
  cancelled: { label: "Huỷ đơn", group: "order" },
  order_cancelled_by_field: { label: "Huỷ đơn (hướng dẫn viên đang phụ trách)", group: "order" },
```

- [ ] **Step 4: Mở rộng `cancelOrder` ở `src/modules/orders/repository.ts`**

Thay hàm `cancelOrder` hiện tại (dòng ~430) bằng:

```ts
/**
 * Huỷ đơn có điều kiện `status = from` (chống hai người đổi cùng lúc). Trả false nếu điều kiện không còn đúng. Mốc `updated_at` mới = `nextStamp(prevUpdatedAt)`
 * (xem `confirmOrder`). `opts` cho phép đường huỷ hẹp của FIELD (ADR-0014 điều 11) ghi một hành động nhật ký riêng kèm lý do — mặc định vẫn là `cancelled` không detail,
 * giữ nguyên hành vi cũ của mọi lời gọi khác.
 */
export async function cancelOrder(db: D1Database, id: string, staffId: string, from: OrderStatus, prevUpdatedAt: string, opts?: { action?: AuditAction; detail?: string }): Promise<boolean> {
  const at = nextStamp(prevUpdatedAt);
  const results = await db.batch([
    db.prepare(`UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ? AND status = ?`).bind(at, id, from),
    auditStatement(db, { orderId: id, staffId, action: opts?.action ?? "cancelled", at, detail: opts?.detail }, "changes() > 0"),
  ]);
  return (results[0]!.meta.changes ?? 0) > 0;
}
```

Thêm `AuditAction` vào import ở dòng 1 của tệp (`audit/index.ts` đã `export type { AuditAction }` sẵn, không cần sửa module `audit`):

```ts
import { auditStatement, type AuditAction } from "../audit";
```

- [ ] **Step 5: Mở `findOrderOwner`, thêm `cancelOrderByHandler` ở `src/modules/orders/index.ts`**

Thay hàm `findOrderOwner` (dòng 36) bằng:

```ts
/**
 * API công khai cho module khác (`dispatch`, cạnh dispatch → orders — ADR-0006 điều 8): đơn có tồn tại không, AI LẬP, trạng thái, và mốc `updated_at`
 * (để `dispatch` truyền vào khoá lạc quan khi tự ghi qua `cancelOrderByHandler`). Chỉ trả các trường này, không lộ gì khác của đơn; null nếu không có đơn.
 */
export async function findOrderOwner(db: D1Database, id: string): Promise<{ staffId: string; status: OrderStatus; updatedAt: string } | null> {
  const meta = await getMeta(db, id);
  return meta ? { staffId: meta.staffId, status: meta.status, updatedAt: meta.updatedAt } : null;
}

/**
 * Huỷ đơn qua đường hẹp của người phụ trách cấp hẹp (`FIELD`, ADR-0014 điều 11) — CHỈ đổi `status`/`updated_at`, không đụng dịch vụ hay cột tiền
 * (đúng khoá "đơn đã xác nhận không đổi tiền" — xem `docs/superpowers/specs/2026-09-22-khoa-tien-don-da-xac-nhan.md`). Route gọi hàm này SAU KHI đã tự
 * kiểm `status === "confirmed"` bằng `findOrderOwner`; hàm này chỉ còn lo tranh chấp (khoá lạc quan) nên vẫn ràng buộc `from: "confirmed"` cho chắc.
 */
export async function cancelOrderByHandler(db: D1Database, id: string, staffId: string, prevUpdatedAt: string, reasonLabel: string): Promise<boolean> {
  return cancelOrder(db, id, staffId, "confirmed", prevUpdatedAt, { action: "order_cancelled_by_field", detail: reasonLabel });
}
```

- [ ] **Step 6: Thêm DTO phản hồi ở `src/shared/contracts.ts`**

Ngay sau `export interface SetHandlerResponse { handler: HandlerDto }` (dòng ~336), thêm:

```ts
export interface HandlerCancelResponse { ok: true }
```

- [ ] **Step 7: Thêm route ở `src/modules/dispatch/index.ts`**

Sửa import ở đầu tệp — dòng 7 và 9:

```ts
import { cancelOrderByHandler, findOrderOwner } from "../orders";
import { getStaffAccount, listStaffAccounts } from "../staff";
import type { AssigneeDto, AssigneesResponse, HandlerCancelResponse, HandlerDto, HandlersResponse, SetHandlerResponse } from "../../shared/contracts";
import { UUID_RE, error, json, readJson } from "../../shared/http";
import { can } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { findHandlerOf, findHandlersOf, insertHandlerStatement, isHandler, type HandlerRow } from "./repository";
import { CANCEL_REASON_LABEL, checkAssignee, handlerChangeVerdict, isOpenHandlerCollision, parseCancelReason, parseOrderIds, parseSetHandler } from "./rules";
```

Thêm hai hằng số lỗi mới cạnh `FORBIDDEN`/`STALE` hiện có (sau dòng `const STALE = ...`):

```ts
const CANCEL_FORBIDDEN = () => error(403, "forbidden", "Chỉ hướng dẫn viên đang phụ trách đơn mới huỷ được đơn theo cách này.");
const NOT_CONFIRMED = () => error(409, "not_editable", "Chỉ huỷ được đơn đã xác nhận qua đường này; đơn nháp hoặc đã huỷ không dùng được.");
const HANDLER_RACED = () => error(409, "stale", "Đơn vừa được người khác đổi, hãy tải lại rồi thử lại.");
```

Thêm route mới vào mảng `routes` của `dispatchModule`, ngay sau route `PUT /api/orders/:id/handler` đã có (trước dấu `],` đóng mảng):

```ts
    // Huỷ đơn qua đường hẹp của người phụ trách CẤP HẸP (FIELD đang phụ trách — ADR-0014 điều 11). Không dùng cho SALES/ADMIN/PARTNER (họ huỷ qua
    // POST /api/orders/:id/status như hôm nay — order.cancel của họ vẫn "none"). Thứ tự: 404 → 403 (không phải người phụ trách/không có order.cancel) →
    // 409 (không phải đơn đã xác nhận, hoặc đã bị đổi trạng thái) → 400 (lý do) → ghi.
    route("POST", "/api/orders/:id/handler-cancel", "staff", async ({ env, request, params, staff, isAssigned }) => {
      const orderId = params.id!;
      if (!UUID_RE.test(orderId)) return NOT_FOUND();
      const [order, assigned] = await Promise.all([findOrderOwner(env.DB, orderId), isAssigned(orderId)]);
      if (!order) return NOT_FOUND();
      if (!can(staff, "order.cancel", { assigned })) return CANCEL_FORBIDDEN();
      if (order.status !== "confirmed") return NOT_CONFIRMED();
      const input = parseCancelReason(await readJson(request));
      if (!input.ok) return error(400, "invalid_input", input.message);
      const ok = await cancelOrderByHandler(env.DB, orderId, staff.id, order.updatedAt, CANCEL_REASON_LABEL[input.reason]);
      if (!ok) {
        const now = await findOrderOwner(env.DB, orderId);
        return now?.status === "confirmed" ? HANDLER_RACED() : NOT_CONFIRMED();
      }
      return json({ ok: true } satisfies HandlerCancelResponse);
    }),
```

- [ ] **Step 8: Chạy kịch bản e2e, xác nhận xanh**

Run: `npm run test:e2e -- dispatch`
Expected: PASS toàn bộ, kể cả mục N mới thêm.

- [ ] **Step 9: `npm test && npm run typecheck`**

Expected: PASS, 0 lỗi.

- [ ] **Step 10: Commit**

```bash
git add src/shared/audit-actions.ts src/shared/contracts.ts src/modules/orders/repository.ts src/modules/orders/index.ts src/modules/dispatch/index.ts tests/e2e/dispatch.mjs
git commit -m "$(cat <<'EOF'
Thêm route huỷ đơn cho FIELD đang phụ trách (ADR-0014 điều 11)

POST /api/orders/:id/handler-cancel, đăng ký ở module dispatch (không phải
orders — FIELD không dùng /api/orders*, ADR-0007 điều 4c). Lý do bắt buộc
từ danh sách đóng hai lựa chọn; chỉ đổi status/updated_at, không đụng dịch
vụ hay cột tiền; ghi một hành động nhật ký riêng (order_cancelled_by_field)
để kế toán lọc được đơn có cọc cần chú ý qua order.history.view đã có sẵn
(không cần bảng/cột mới).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Cập nhật tài liệu mô tả + kiểm toàn bộ

**Files:**
- Modify: `src/shared/permissions.ts` (chú thích ở đầu `MATRIX` — bỏ `order.cancel` khỏi danh sách "chưa có route dùng")
- Modify: `docs/SYSTEM-DESIGN.md` (nếu có dòng nhắc `order.cancel`/route của FIELD — tìm bằng `grep -n "order.cancel" docs/SYSTEM-DESIGN.md`)
- Modify: `docs/DATA-DICTIONARY.md` — KHÔNG cần sửa tay: không có bảng/cột mới, chỉ `npm run dict` nếu `docs/data-dictionary.json` có nhắc hành động nhật ký (kiểm bằng `grep -n "cancelled\b" docs/data-dictionary.json`).

- [ ] **Step 1: Sửa chú thích ở `src/shared/permissions.ts`**

Dòng đang viết (gần đầu, đoạn mô tả `MATRIX`):

```
 * Thao tác của N2/N3 (task.progress, order.money.edit, payment.*, invoice.*) và ADR-0014 Phase B/C (order.cancel, dispatch.guides.view,
 * dispatch.request) có mặt để test khoá bản đồ; CHƯA có route dùng (thi công ở phiên sau — xem "Ngoài phạm vi" của ADR-0014).
```

Sửa thành:

```
 * Thao tác của N2/N3 (task.progress, order.money.edit, payment.*, invoice.*) và ADR-0014 Phase C (dispatch.guides.view, dispatch.request) có mặt để
 * test khoá bản đồ; CHƯA có route dùng (thi công ở phiên sau). `order.cancel` (FIELD) đã có route thật (`POST /api/orders/:id/handler-cancel`,
 * module dispatch — ADR-0014 điều 11, Phase B). `order.money.edit` (FIELD) CHƯA thi công: chặn bởi xung đột kiến trúc chưa chủ dự án quyết, xem
 * `docs/superpowers/specs/2026-09-22-dong-dieu-chinh-sau-xac-nhan-cau-hoi.md`.
```

Và sửa dòng comment ngay tại ô `"order.cancel": row(...)`:

```ts
  "order.cancel": row("none", "none", "none", "assigned", "none", "any"), // huỷ đơn đang phụ trách, lý do bắt buộc — ADR-0014 điều 11, route: POST /api/orders/:id/handler-cancel (module dispatch)
```

- [ ] **Step 2: Kiểm tài liệu mô tả có nhắc "chưa có route" cho order.cancel không**

Run: `grep -n "order.cancel\|order\\.cancel" docs/SYSTEM-DESIGN.md`

Nếu có dòng nói "chưa có route" cho `order.cancel`, sửa thành mô tả route thật vừa thêm (câu ngắn, đúng giọng tài liệu quanh đó). Nếu không có dòng nào nhắc riêng `order.cancel` (bảng quyền §8 có thể chỉ liệt các ô, không nhắc route), bỏ qua bước này.

- [ ] **Step 3: Chạy toàn bộ kiểm**

Run: `npm test`
Expected: PASS toàn bộ (không giảm so với mốc đầu phiên: 451/451 hoặc nhiều hơn nếu test mới làm tăng tổng).

Run: `npm run typecheck`
Expected: 0 lỗi.

Run: `npm run test:e2e`
Expected: 16/16 kịch bản (hoặc nhiều hơn nếu có kịch bản mới) xanh, kể cả `audit-invariants --strict` ở cuối.

- [ ] **Step 4: Commit**

```bash
git add src/shared/permissions.ts docs/SYSTEM-DESIGN.md
git commit -m "$(cat <<'EOF'
Cập nhật tài liệu mô tả: order.cancel (FIELD) đã có route thật

Bỏ order.cancel khỏi danh sách "chưa có route dùng" ở permissions.ts và
SYSTEM-DESIGN.md sau khi Task 3 thêm POST /api/orders/:id/handler-cancel.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Kiểm độc lập (bắt buộc — CLAUDE.md §3, việc lớn)

Không phải một commit — một lượt kiểm CHỈ ĐỌC bởi một subagent riêng, không phải người vừa thi công. Gọi Agent tool (subagent_type mặc định/general-purpose, KHÔNG dùng "fork" — cần một góc nhìn độc lập, không kế thừa niềm tin đã hình thành trong phiên thi công), giao nhiệm vụ:

- Đọc lại mã thật của bốn task trên (không tin tóm tắt của người thi công).
- Tự chạy `npm test`, `npm run typecheck`, `npm run test:e2e -- dispatch` (và toàn bộ `npm run test:e2e` nếu có thời gian) — không dùng lại kết quả đã báo.
- Trọng tâm rà: (a) `checkAssignee` mở đúng phạm vi — KHÔNG vô tình mở thêm cho `PARTNER` hay quyền khác; (b) route `handler-cancel` KHÔNG đụng `order_item`/`order_service`/cột tiền của `orders` dưới bất kỳ đường nào (đọc kỹ `cancelOrder`/`cancelOrderByHandler`); (c) `can(staff, "order.cancel", ...)` được gọi ĐÚNG TRƯỚC khi ghi, không có đường tắt nào bỏ qua; (d) lý do huỷ thực sự bị chặn nếu không đúng danh sách đóng (thử bằng tay một giá trị lạ qua e2e hoặc test); (e) route KHÔNG lộ tiền/giá cho FIELD (đọc kỹ phản hồi `{ ok: true }`, không có trường nào khác lọt vào).
- Không sửa mã. Chỉ báo cáo: đạt/không đạt, kèm bằng chứng (lệnh đã chạy, kết quả).

Chỉ báo "đạt" với chủ dự án SAU KHI có báo cáo này xác nhận đạt. Nếu có lỗ, vá ngay trong phiên (thêm test đỏ tái hiện, sửa, xanh), rồi kiểm độc lập lại đúng chỗ vừa vá (không cần lặp toàn bộ).
