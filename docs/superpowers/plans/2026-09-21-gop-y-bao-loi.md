# Góp ý / Báo lỗi (module `feedback`) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người dùng đã đăng nhập gửi báo lỗi/đề xuất/câu hỏi cho admin ngay trong app; admin trả lời trong luồng, đổi trạng thái, nhận email; nền dữ liệu dạng ticket cho kênh hỗ trợ sau này.

**Architecture:** Module mới `src/modules/feedback` (bảng `fbk_*`) theo khuôn module "nghiêm" như `parties`: `rules.ts` thuần + `repository.ts` (mọi SQL qua `defineSql`) + `notify.ts` (email, inject được để test) + `index.ts` (route). Hằng/luật chuyển trạng thái dùng chung server–web ở `src/shared/feedback-catalog.ts`. Giao diện là một trang `/feedback` + mục menu có chấm đỏ.

**Tech Stack:** Cloudflare Workers + D1 (SQLite), TypeScript, `node --test`, esbuild, PWA thuần DOM (`h()`), Cloudflare Email Service (`env.EMAIL.send`, beta).

**Spec:** `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md` (đã duyệt 2026-09-21).

## Global Constraints

- Tiếng Việt CÓ DẤU đầy đủ ở mọi chuỗi hiển thị, lỗi, chú thích; định danh mã giữ nguyên.
- Migration chỉ THÊM file mới, không sửa file đã có. Số: **`0016`** (chừa `0013`–`0015` cho B5/v1.0; wrangler chấp nhận khoảng trống). Nếu `migrations/` lúc thi công đã có số ≥ 0016 thì dùng số kế tiếp — nội dung không phụ thuộc số. Deploy **độc lập, không gộp với B5**.
- Bảng mới: tiền tố `fbk_`; tra cứu khoá `code`; có `created_at/created_by/updated_at/updated_by` (`*_by` là `TEXT NULL`, không khoá ngoại); khoá ngoại `NO ACTION`; **không `DELETE`** (bài kiểm R-N1-9 bắt).
- Mọi SQL của `repository.ts` đi qua `defineSql("feedback", <tên>, <SQL tĩnh>)`; tham số tuỳ chọn viết `?N IS NULL OR …`; import bằng đuôi `.ts`. Đọc tên người CHỈ qua view `v_stf_staff_label`.
- Chuỗi từ người dùng chỉ đi qua `textContent`/`h()`, không `innerHTML`; không `style=` nội tuyến (CSP).
- Giới hạn: `title` 1–120, `body` 1–4000, tối đa 5 yêu cầu mới/giờ/tài khoản, 30 tin nhắn/giờ/tài khoản (gồm tin mô tả ban đầu).
- Quyền: cột `SALES, ACCOUNTING, ADMIN, FIELD`. Không dùng vai trò hồ sơ làm điều kiện.
- Mỗi commit kết thúc bằng dòng `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Nếu repo có `CLAUDE.md` / `docs/CHANGE-GUIDE.md` (nhánh v1.0 `worktree-tai-lieu-nen-tang` chưa gộp lúc lập kế hoạch) thì đọc và tuân theo trước khi sửa; nếu nhánh đó gộp trước, ĐỌC LẠI `web/shell.ts`, `web/account.ts`, `package.json`, `src/index.ts`, `src/shared/contracts.ts` trước khi sửa vì có thể đã đổi.
- Lệnh kiểm chung: `npm test`, `npm run typecheck`, `npm run test:e2e` (cần mạng; ~vài phút).

## Điều chỉnh so với spec (Task 1 ghi vào spec)

1. **Chống spam:** không dùng bảng `login_attempt`/`reserveAttempts` (bảng của `auth`, và mẫu đó có `DELETE` — bị R-N1-9 cấm với bảng mới). Thay bằng **một câu `INSERT … SELECT … WHERE (đếm trong cửa sổ) < trần`** trên chính bảng `fbk_ticket`/`fbk_message`: đếm và chèn cùng một câu lệnh nên hai request song song không cùng qua trần (D1 tuần tự hoá ghi).
2. `fbk_ticket.seq INTEGER UNIQUE` thay cột `code`; mã `YC-0007` tính bằng `feedbackCode(seq)`.
3. `submitter_id` là `TEXT NOT NULL` (người gửi luôn có); vẫn không khoá ngoại.
4. Đổi trạng thái dùng **khoá lạc quan theo trạng thái cũ** (`WHERE status_code = <từ>`), không theo `updated_at` (mỗi tin nhắn đều đổi `updated_at`, sẽ làm PATCH của admin hỏng oan).
5. `context.orderCode` là chuỗi thường, không đọc `v_ord_order_label` → không có cạnh `feedback → orders`. Giao diện v1 chưa tự điền `orderCode`.
6. v1 dùng **trang `/feedback`** (form + danh sách + luồng) thay cho bảng trượt dưới.
7. Thêm hành động nhật ký `feedback_assigned` (đổi người xử lý).

## Cấu trúc file

| File | Việc |
|---|---|
| `src/shared/feedback-catalog.ts` (+`.test.ts`) | loại, trạng thái, nhãn, bảng chuyển trạng thái, mã `YC-`; dùng cả server và `web/` |
| `src/modules/feedback/rules.ts` (+`.test.ts`) | kiểm đầu vào, lọc `context`, phạm vi xem, cửa sổ tần suất |
| `src/modules/feedback/repository.ts` | SQL `fbk_*` (defineSql) |
| `src/modules/feedback/notify.ts` (+`.test.ts`) | dựng và gửi email qua `Mailer` tiêm vào |
| `src/modules/feedback/index.ts` | route + đăng ký module |
| `migrations/0016_feedback.sql` | bảng `fbk_*` |
| `src/shared/{permissions,audit-actions,contracts,sw-policy}.ts` | quyền, nhật ký, DTO, danh sách trang |
| `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md`, `src/architecture.test.ts` | sổ dữ liệu + ràng buộc kiến trúc |
| `tests/e2e/feedback.mjs`, `tests/e2e/run.mjs` | e2e |
| `public/feedback.html`, `web/feedback.ts`, `web/shell.ts`, `web/account.ts`, `package.json` | giao diện |
| `docs/HANDOFF-FEEDBACK.md`, `docs/ARCHITECTURE.md` | bàn giao + triển khai |

---

### Task 1: Ghi các điều chỉnh vào spec

**Files:**
- Modify: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md`

- [ ] **Step 1: Sửa spec cho khớp mục "Điều chỉnh so với spec" ở đầu kế hoạch**

Trong file spec, thay đúng các đoạn sau (dùng công cụ Edit, mỗi cặp `old_string` phải duy nhất):

1. Đoạn bắt đầu `- **Chống spam** tái dùng mẫu` (cả gạch đầu dòng) → thay bằng:

```
- **Chống spam**: một câu `INSERT … SELECT … WHERE (SELECT count(*) … trong 1 giờ) < trần` trên chính `fbk_ticket` / `fbk_message` — đếm và chèn cùng MỘT câu lệnh nên hai request song song không cùng qua trần (không tự viết `SELECT count` rồi `INSERT` ở hai bước). Không dùng `login_attempt`/`reserveAttempts`: đó là bảng của `auth`, và mẫu ấy có `DELETE` mà bài kiểm R-N1-9 cấm với bảng mới. Trần áp cho **cả** `POST /api/feedback` (5/giờ/tài khoản) **và** `POST /api/feedback/:id/messages` (30/giờ/tài khoản, tính cả tin mô tả ban đầu); chỉnh ở `rules.ts`.
```

2. Trong mục Dữ liệu, `- \`fbk_ticket\`: \`id\`, \`code\` (dạng \`YC-0007\`, người đọc được),` → `- \`fbk_ticket\`: \`id\`, \`seq\` (số thứ tự duy nhất; mã người đọc \`YC-0007\` tính từ \`seq\` ở code),`
3. Cùng mục: `- Cột WHO (\`submitter_id\`, \`assignee_id\`, \`author_id\`) là \`TEXT NULL\`,` → `- Cột WHO (\`submitter_id\` và \`author_id\` là \`TEXT NOT NULL\` vì luôn có người; \`assignee_id\` là \`TEXT NULL\`),`
4. Trong bảng API, dòng `PATCH /api/feedback/:id` cột "Việc": `đổi trạng thái, người xử lý (khoá lạc quan)` → `đổi trạng thái, người xử lý (khoá lạc quan theo trạng thái cũ: đổi từ trạng thái đã khác → 409)`
5. Đoạn `- Không lưu nội dung đơn, **chỉ mã đơn** (\`orderCode\`), hiển thị qua \`v_ord_order_label\`.` → `- Không lưu nội dung đơn, **chỉ mã đơn** (\`orderCode\`, chuỗi thường; v1 giao diện chưa tự điền, chưa đọc \`v_ord_order_label\` nên không có cạnh \`feedback → orders\`).`
6. Trong mục Giao diện, `- Mục "Góp ý / Báo lỗi" trong menu chung (\`web/shell.ts\`) mở bảng trượt dưới (kiểu \`trip-sheet\`): loại,` → `- Mục "Góp ý" trong menu chung (\`web/shell.ts\`, kèm chấm đỏ) và ở tab Tôi mở trang \`/feedback\` (v1 dùng trang, bảng trượt dưới để sau): loại,`
7. Trong mục Nhật ký, `\`feedback_status_changed\` vào` → `\`feedback_status_changed\`, \`feedback_assigned\` vào`

- [ ] **Step 2: Kiểm không còn chữ cũ**

Run: `grep -n "reserveAttempts\|\`code\` (dạng\|bảng trượt dưới (kiểu" docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md`
Expected: chỉ còn dòng nhắc `reserveAttempts` trong câu giải thích "Không dùng `login_attempt`/`reserveAttempts`".

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md
git commit -m "Spec Góp ý/Báo lỗi: điều chỉnh theo khảo sát mã (chống spam bằng INSERT có điều kiện, seq, trang /feedback)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Danh mục dùng chung `feedback-catalog`

**Files:**
- Create: `src/shared/feedback-catalog.ts`
- Test: `src/shared/feedback-catalog.test.ts`

**Interfaces:**
- Produces: `FEEDBACK_KINDS`, `FeedbackKind`, `FEEDBACK_KIND_NAME`, `isFeedbackKind`, `FEEDBACK_STATUSES`, `FeedbackStatus`, `FEEDBACK_STATUS_NAME`, `isFeedbackStatus`, `FEEDBACK_TRANSITIONS`, `canTransition(from, to): boolean`, `statusAfterSubmitterReply(s): FeedbackStatus`, `feedbackCode(seq: number): string`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// src/shared/feedback-catalog.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { FEEDBACK_STATUSES, FEEDBACK_TRANSITIONS, canTransition, feedbackCode, isFeedbackKind, isFeedbackStatus, statusAfterSubmitterReply, type FeedbackStatus } from "./feedback-catalog.ts";

test("bảng chuyển trạng thái: đúng từng cặp (5 × 5)", () => {
  const ok: Record<FeedbackStatus, FeedbackStatus[]> = {
    NEW: ["ACK"],
    ACK: ["IN_PROGRESS", "DONE", "DECLINED"],
    IN_PROGRESS: ["DONE", "DECLINED"],
    DONE: ["ACK"],
    DECLINED: ["ACK"],
  };
  for (const from of FEEDBACK_STATUSES) for (const to of FEEDBACK_STATUSES) assert.equal(canTransition(from, to), ok[from].includes(to), `${from} → ${to}`);
  assert.deepEqual(Object.keys(FEEDBACK_TRANSITIONS).sort(), [...FEEDBACK_STATUSES].sort());
});

test("người gửi trả lời: DONE/DECLINED mở lại thành ACK, trạng thái khác giữ nguyên", () => {
  assert.equal(statusAfterSubmitterReply("DONE"), "ACK");
  assert.equal(statusAfterSubmitterReply("DECLINED"), "ACK");
  for (const s of ["NEW", "ACK", "IN_PROGRESS"] as const) assert.equal(statusAfterSubmitterReply(s), s);
});

test("mã người đọc và kiểm giá trị lạ", () => {
  assert.equal(feedbackCode(7), "YC-0007");
  assert.equal(feedbackCode(12345), "YC-12345");
  assert.equal(isFeedbackKind("BUG"), true);
  assert.equal(isFeedbackKind("bug"), false);
  assert.equal(isFeedbackStatus("NEW"), true);
  assert.equal(isFeedbackStatus("CLOSED"), false);
  assert.equal(canTransition("NEW", "NEW"), false);
});
```

- [ ] **Step 2: Chạy, phải đỏ**

Run: `node --test src/shared/feedback-catalog.test.ts`
Expected: FAIL (không tìm thấy `./feedback-catalog.ts`).

- [ ] **Step 3: Cài đặt**

```ts
// src/shared/feedback-catalog.ts
// Danh mục Góp ý / Báo lỗi dùng chung server và web/: loại, trạng thái, nhãn, luật chuyển trạng thái. Logic thuần, không import gì.
// Bảng tra cứu fbk_kind / fbk_status trong migration phản chiếu đúng danh sách này (test src/modules/feedback/rules.test.ts đối chiếu).

export const FEEDBACK_KINDS = ["BUG", "IDEA", "QUESTION"] as const;
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number];
export const FEEDBACK_KIND_NAME: Record<FeedbackKind, string> = { BUG: "Báo lỗi", IDEA: "Đề xuất", QUESTION: "Câu hỏi" };
export const isFeedbackKind = (v: unknown): v is FeedbackKind => typeof v === "string" && (FEEDBACK_KINDS as readonly string[]).includes(v);

export const FEEDBACK_STATUSES = ["NEW", "ACK", "IN_PROGRESS", "DONE", "DECLINED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const FEEDBACK_STATUS_NAME: Record<FeedbackStatus, string> = {
  NEW: "Mới",
  ACK: "Đã tiếp nhận",
  IN_PROGRESS: "Đang xử lý",
  DONE: "Đã xong",
  DECLINED: "Từ chối",
};
export const isFeedbackStatus = (v: unknown): v is FeedbackStatus => typeof v === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(v);

/** Chuyển trạng thái do admin làm. DONE/DECLINED → ACK là "mở lại" (admin, hoặc người gửi trả lời: xem `statusAfterSubmitterReply`). */
export const FEEDBACK_TRANSITIONS: Record<FeedbackStatus, readonly FeedbackStatus[]> = {
  NEW: ["ACK"],
  ACK: ["IN_PROGRESS", "DONE", "DECLINED"],
  IN_PROGRESS: ["DONE", "DECLINED"],
  DONE: ["ACK"],
  DECLINED: ["ACK"],
};
export const canTransition = (from: FeedbackStatus, to: FeedbackStatus): boolean => FEEDBACK_TRANSITIONS[from].includes(to);

/** Người gửi trả lời khi yêu cầu đã đóng → mở lại thành "Đã tiếp nhận". SQL ở repository.ts phản chiếu đúng luật này. */
export const statusAfterSubmitterReply = (s: FeedbackStatus): FeedbackStatus => (s === "DONE" || s === "DECLINED" ? "ACK" : s);

/** Mã người đọc: YC-0007. */
export const feedbackCode = (seq: number): string => `YC-${String(seq).padStart(4, "0")}`;
```

- [ ] **Step 4: Chạy, phải xanh**

Run: `node --test src/shared/feedback-catalog.test.ts`
Expected: 3 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/feedback-catalog.ts src/shared/feedback-catalog.test.ts
git commit -m "Góp ý: danh mục dùng chung (loại, trạng thái, bảng chuyển, mã YC-)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Luật thuần `rules.ts`

**Files:**
- Create: `src/modules/feedback/rules.ts`
- Test: `src/modules/feedback/rules.test.ts`
- Modify: `src/architecture.test.ts` (khai cạnh, để bài kiểm "mọi module khai ALLOWED_EDGES" không đỏ khi thư mục module xuất hiện)

**Interfaces:**
- Consumes: `isFeedbackKind`, `isFeedbackStatus`, `FeedbackKind`, `FeedbackStatus` (Task 2); `can`, `PermissionHolder` từ `src/shared/permissions.ts` (chỉ dùng ở Task 5 sau khi có ô MATRIX — ở Task này KHÔNG import `can`).
- Produces (dùng ở Task 5–7): `TITLE_MAX`, `BODY_MAX`, `TICKET_LIMIT_PER_HOUR`, `MESSAGE_LIMIT_PER_HOUR`, `RATE_WINDOW_MS`, `windowStart(now: Date): string`, `CLIENT_REQUEST_ID_RE`, `Checked<T>`, `TicketInput`, `validateTicketInput(raw)`, `MessageInput`, `validateMessageInput(raw)`, `PatchInput`, `validatePatchInput(raw)`, `sanitizeContext(raw: unknown): string`, `parseContext(json: string): FeedbackContextShape`.

- [ ] **Step 1: Viết test (đỏ)**

```ts
// src/modules/feedback/rules.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME } from "../../shared/feedback-catalog.ts";
import { BODY_MAX, TITLE_MAX, parseContext, sanitizeContext, validateMessageInput, validatePatchInput, validateTicketInput, windowStart } from "./rules.ts";

const REQ = "0b8f6f2e-3c1a-4f6e-9a55-2b6f4d1c7e10";
const ok = { kind: "BUG", title: "  Nút lưu   không bấm được ", body: "Mô tả\r\nchi tiết", clientRequestId: REQ };

test("validateTicketInput: nhận đầu vào hợp lệ, chuẩn hoá tiêu đề và xuống dòng", () => {
  const r = validateTicketInput(ok);
  assert.ok(r.ok);
  assert.equal(r.value.title, "Nút lưu không bấm được");
  assert.equal(r.value.body, "Mô tả\nchi tiết");
  assert.equal(r.value.kind, "BUG");
  assert.equal(r.value.context, "{}");
});

test("validateTicketInput: từ chối loại lạ, tiêu đề/nội dung rỗng hoặc quá dài, id yêu cầu sai", () => {
  const bad = (patch: Record<string, unknown>) => assert.equal(validateTicketInput({ ...ok, ...patch }).ok, false, JSON.stringify(patch));
  bad({ kind: "bug" });
  bad({ kind: undefined });
  bad({ title: "   " });
  bad({ title: "x".repeat(TITLE_MAX + 1) });
  bad({ body: "" });
  bad({ body: "y".repeat(BODY_MAX + 1) });
  bad({ clientRequestId: "abc" });
  bad({ clientRequestId: undefined });
  assert.equal(validateTicketInput({ ...ok, title: "x".repeat(TITLE_MAX) }).ok, true);
  assert.equal(validateTicketInput({ ...ok, body: "y".repeat(BODY_MAX) }).ok, true);
});

test("sanitizeContext: chỉ giữ khoá cho phép, cắt độ dài, bỏ ký tự điều khiển, bỏ khoá lạ", () => {
  const raw = { path: "/order", orderCode: "TD-0007", device: "iPhone\u0000 Safari", standalone: true, appVersion: "20260921", evil: "<script>", nested: { a: 1 } };
  assert.deepEqual(parseContext(sanitizeContext(raw)), { path: "/order", orderCode: "TD-0007", device: "iPhone  Safari", standalone: true, appVersion: "20260921" });
  assert.equal(sanitizeContext(undefined), "{}");
  assert.equal(sanitizeContext("chuỗi"), "{}");
  assert.equal(sanitizeContext([1, 2]), "{}");
  assert.deepEqual(parseContext(sanitizeContext({ path: "order" })), {}, "path phải bắt đầu bằng /");
  assert.deepEqual(parseContext(sanitizeContext({ orderCode: "a b" })), {}, "orderCode chỉ gồm chữ số . _ -");
  assert.equal(parseContext(sanitizeContext({ device: "d".repeat(500) })).device?.length, 120);
  assert.deepEqual(parseContext("không phải JSON"), {});
});

test("validateMessageInput: nội dung 1..4000, internal mặc định false", () => {
  assert.deepEqual(validateMessageInput({ body: " Đã nhận " }), { ok: true, value: { body: "Đã nhận", internal: false } });
  assert.deepEqual(validateMessageInput({ body: "x", internal: true }), { ok: true, value: { body: "x", internal: true } });
  assert.equal(validateMessageInput({ body: "  " }).ok, false);
  assert.equal(validateMessageInput({ body: "y".repeat(BODY_MAX + 1) }).ok, false);
  assert.equal(validateMessageInput({ body: "x", internal: "có" }).ok, false);
});

test("validatePatchInput: cần ít nhất một trường; status hợp lệ; resolvedIn chỉ đi cùng DONE", () => {
  assert.equal(validatePatchInput({}).ok, false);
  assert.equal(validatePatchInput({ status: "CLOSED" }).ok, false);
  assert.deepEqual(validatePatchInput({ status: "ACK" }), { ok: true, value: { status: "ACK" } });
  assert.deepEqual(validatePatchInput({ assigneeId: null }), { ok: true, value: { assignee: { value: null } } });
  assert.deepEqual(validatePatchInput({ status: "DONE", resolvedIn: "20260921120000" }), { ok: true, value: { status: "DONE", resolvedIn: { value: "20260921120000" } } });
  assert.equal(validatePatchInput({ status: "ACK", resolvedIn: "x" }).ok, false);
  assert.equal(validatePatchInput({ resolvedIn: "x" }).ok, false);
  assert.equal(validatePatchInput({ assigneeId: 5 }).ok, false);
});

test("windowStart: lùi đúng 1 giờ, ISO UTC", () => {
  assert.equal(windowStart(new Date("2026-09-21T10:00:00.000Z")), "2026-09-21T09:00:00.000Z");
});

test("bảng tra cứu trong migration phản chiếu danh mục ở code", () => {
  const dir = join(import.meta.dirname, "..", "..", "..", "migrations");
  const file = readdirSync(dir).find((f) => f.endsWith("_feedback.sql"));
  assert.ok(file, "chưa có migration *_feedback.sql");
  const sql = readFileSync(join(dir, file), "utf8");
  for (const k of FEEDBACK_KINDS) assert.ok(sql.includes(`('${k}', '${FEEDBACK_KIND_NAME[k]}'`), `thiếu loại ${k} trong migration`);
  for (const s of FEEDBACK_STATUSES) assert.ok(sql.includes(`('${s}', '${FEEDBACK_STATUS_NAME[s]}'`), `thiếu trạng thái ${s} trong migration`);
});
```

(Test cuối cần migration của Task 4; ở Step 2/4 của task này chạy `--test-name-pattern` để bỏ qua nó, Task 4 sẽ chạy nó xanh.)

- [ ] **Step 2: Chạy, phải đỏ**

Run: `node --test src/modules/feedback/rules.test.ts`
Expected: FAIL (không tìm thấy `./rules.ts`).

- [ ] **Step 3: Cài đặt**

```ts
// src/modules/feedback/rules.ts
// Luật thuần của Góp ý / Báo lỗi (không I/O). Kiểm đầu vào, lọc `context` (không đáng tin), trần tần suất.
// Import bằng đuôi .ts để node --test chạy trực tiếp.
import { isFeedbackKind, isFeedbackStatus, type FeedbackKind, type FeedbackStatus } from "../../shared/feedback-catalog.ts";

export const TITLE_MAX = 120;
export const BODY_MAX = 4000;
/** Trần theo tài khoản trong cửa sổ 1 giờ. Tin nhắn tính cả tin mô tả ban đầu của yêu cầu mới. */
export const TICKET_LIMIT_PER_HOUR = 5;
export const MESSAGE_LIMIT_PER_HOUR = 30;
export const RATE_WINDOW_MS = 60 * 60 * 1000;
/** Đầu cửa sổ tần suất (ISO UTC) — so chuỗi với created_at (cũng ISO UTC). */
export const windowStart = (now: Date): string => new Date(now.getTime() - RATE_WINDOW_MS).toISOString();

export const CLIENT_REQUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };
const bad = (message: string): { ok: false; message: string } => ({ ok: false, message });

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f]/g;
// eslint-disable-next-line no-control-regex
const CONTROL_KEEP_NEWLINE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

const cleanTitle = (v: unknown): string => (typeof v === "string" ? v.replace(CONTROL, " ").replace(/\s+/g, " ").trim() : "");
const cleanBody = (v: unknown): string => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(CONTROL_KEEP_NEWLINE, "").trim() : "");

export interface FeedbackContextShape {
  path?: string;
  orderCode?: string;
  device?: string;
  standalone?: boolean;
  appVersion?: string;
}

/** `context` do trình duyệt gửi → KHÔNG đáng tin: chỉ nhận bộ khoá cố định, cắt độ dài, bỏ ký tự điều khiển. Trả JSON đã lọc. */
export function sanitizeContext(raw: unknown): string {
  const out: FeedbackContextShape = {};
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const r = raw as Record<string, unknown>;
    if (typeof r.path === "string") {
      const p = r.path.replace(CONTROL, " ").slice(0, 200);
      if (p.startsWith("/")) out.path = p;
    }
    if (typeof r.orderCode === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(r.orderCode)) out.orderCode = r.orderCode;
    if (typeof r.device === "string") {
      const d = r.device.replace(CONTROL, " ").trim().slice(0, 120);
      if (d) out.device = d;
    }
    if (typeof r.standalone === "boolean") out.standalone = r.standalone;
    if (typeof r.appVersion === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(r.appVersion)) out.appVersion = r.appVersion;
  }
  return JSON.stringify(out);
}

/** Đọc lại JSON đã lưu; hỏng thì {} (không bao giờ ném). */
export function parseContext(json: string): FeedbackContextShape {
  try {
    const v = JSON.parse(json) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as FeedbackContextShape) : {};
  } catch {
    return {};
  }
}

export interface TicketInput {
  kind: FeedbackKind;
  title: string;
  body: string;
  clientRequestId: string;
  /** JSON đã lọc. */
  context: string;
}

export function validateTicketInput(raw: Record<string, unknown>): Checked<TicketInput> {
  if (!isFeedbackKind(raw.kind)) return bad("Loại yêu cầu không hợp lệ.");
  const title = cleanTitle(raw.title);
  if (title.length < 1 || title.length > TITLE_MAX) return bad(`Tiêu đề phải từ 1 đến ${TITLE_MAX} ký tự.`);
  const body = cleanBody(raw.body);
  if (body.length < 1 || body.length > BODY_MAX) return bad(`Nội dung phải từ 1 đến ${BODY_MAX} ký tự.`);
  if (typeof raw.clientRequestId !== "string" || !CLIENT_REQUEST_ID_RE.test(raw.clientRequestId)) return bad("Mã yêu cầu của thiết bị không hợp lệ.");
  return { ok: true, value: { kind: raw.kind, title, body, clientRequestId: raw.clientRequestId, context: sanitizeContext(raw.context) } };
}

export interface MessageInput {
  body: string;
  internal: boolean;
}

export function validateMessageInput(raw: Record<string, unknown>): Checked<MessageInput> {
  const body = cleanBody(raw.body);
  if (body.length < 1 || body.length > BODY_MAX) return bad(`Nội dung phải từ 1 đến ${BODY_MAX} ký tự.`);
  if (raw.internal !== undefined && typeof raw.internal !== "boolean") return bad("Cờ ghi chú nội bộ không hợp lệ.");
  return { ok: true, value: { body, internal: raw.internal === true } };
}

export interface PatchInput {
  status?: FeedbackStatus;
  assignee?: { value: string | null };
  resolvedIn?: { value: string | null };
}

export function validatePatchInput(raw: Record<string, unknown>): Checked<PatchInput> {
  const out: PatchInput = {};
  if (raw.status !== undefined) {
    if (!isFeedbackStatus(raw.status)) return bad("Trạng thái không hợp lệ.");
    out.status = raw.status;
  }
  if (raw.assigneeId !== undefined) {
    if (raw.assigneeId !== null && (typeof raw.assigneeId !== "string" || !/^[0-9a-f-]{36}$/.test(raw.assigneeId))) return bad("Người xử lý không hợp lệ.");
    out.assignee = { value: raw.assigneeId };
  }
  if (raw.resolvedIn !== undefined) {
    if (out.status !== "DONE") return bad("Chỉ ghi bản sửa (resolvedIn) khi chuyển sang Đã xong.");
    if (raw.resolvedIn !== null && (typeof raw.resolvedIn !== "string" || !/^[A-Za-z0-9._-]{1,40}$/.test(raw.resolvedIn))) return bad("Mã bản sửa không hợp lệ.");
    out.resolvedIn = { value: raw.resolvedIn };
  }
  if (out.status === undefined && out.assignee === undefined) return bad("Không có thay đổi nào để lưu.");
  return { ok: true, value: out };
}
```

- [ ] **Step 4: Khai cạnh trong bài kiểm kiến trúc**

Trong `src/architecture.test.ts`, thêm vào `ALLOWED_EDGES` (giữ thứ tự chữ cái) dòng:

```ts
  feedback: ["staff", "audit"],
```

Và vào `TABLE_PREFIX` thêm `fbk_: "feedback",`:

```ts
const TABLE_PREFIX: Record<string, string> = { pty_: "parties", loc_: "locations", stf_: "staff", fbk_: "feedback", dsp_: "dispatch", bil_: "billing" };
```

- [ ] **Step 5: Chạy test riêng của task**

Run: `node --test --test-name-pattern="^(?!bảng tra cứu trong migration)" src/modules/feedback/rules.test.ts`
Expected: 6 test PASS (test đối chiếu migration bị loại, chờ Task 4).

- [ ] **Step 6: Commit**

```bash
git add src/modules/feedback/rules.ts src/modules/feedback/rules.test.ts src/architecture.test.ts
git commit -m "Góp ý: luật thuần (kiểm đầu vào, lọc context, trần tần suất) + khai cạnh kiến trúc

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Lưu ý: từ đây đến hết Task 6 bài kiểm kiến trúc còn đỏ một phần (sổ dữ liệu thiếu `fbk_*`, chưa có `STRICT`); Task 4 và Task 5 đưa nó về xanh.

---

### Task 4: Migration + sổ dữ liệu

**Files:**
- Create: `migrations/0016_feedback.sql`
- Modify: `docs/data-dictionary.json`
- Regenerate: `docs/DATA-DICTIONARY.md` (lệnh `npm run dict`)

**Interfaces:**
- Produces: bảng `fbk_kind`, `fbk_status`, `fbk_ticket`, `fbk_message` với cột dùng ở `repository.ts` (Task 5).

- [ ] **Step 1: Viết migration**

```sql
-- Migration 0016 — Góp ý / Báo lỗi (module feedback). Spec: docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md. Chỉ THÊM.
-- Số 0013–0015 chừa cho B5/v1.0; wrangler áp mọi file chưa áp nên khoảng trống không sao.

CREATE TABLE fbk_kind (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO fbk_kind (code, name, sort_order) VALUES ('BUG', 'Báo lỗi', 1), ('IDEA', 'Đề xuất', 2), ('QUESTION', 'Câu hỏi', 3);

CREATE TABLE fbk_status (
  code       TEXT PRIMARY KEY CHECK (code = upper(code)),
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active     INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1))
);
INSERT INTO fbk_status (code, name, sort_order) VALUES
  ('NEW', 'Mới', 1), ('ACK', 'Đã tiếp nhận', 2), ('IN_PROGRESS', 'Đang xử lý', 3), ('DONE', 'Đã xong', 4), ('DECLINED', 'Từ chối', 5);

CREATE TABLE fbk_ticket (
  id                   TEXT PRIMARY KEY,
  seq                  INTEGER NOT NULL UNIQUE CHECK (seq >= 1),                          -- mã người đọc YC-0007 tính từ đây (feedbackCode)
  kind_code            TEXT NOT NULL REFERENCES fbk_kind(code),
  status_code          TEXT NOT NULL REFERENCES fbk_status(code),
  title                TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 120),
  context              TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(context) AND length(context) <= 2000),   -- do trình duyệt gửi: KHÔNG đáng tin, đã lọc khoá ở rules.ts
  submitter_id         TEXT NOT NULL,                                                     -- WHO: không khoá ngoại (ADR-0002/N1)
  assignee_id          TEXT,
  client_request_id    TEXT NOT NULL CHECK (length(client_request_id) = 36),              -- UUID do thiết bị sinh: chống gửi trùng khi mạng yếu
  resolved_in          TEXT CHECK (resolved_in IS NULL OR length(resolved_in) <= 40),     -- mã bản dựng đã sửa (tuỳ chọn)
  submitter_seen_at    TEXT,                                                              -- mốc người gửi đã xem lần cuối (chấm đỏ)
  admin_seen_at        TEXT,                                                              -- mốc admin đã xem lần cuối (dùng chung mọi admin ở v1)
  last_activity_at     TEXT NOT NULL,
  last_public_reply_at TEXT,                                                              -- phản hồi/đổi trạng thái người gửi thấy được
  notified_at          TEXT,                                                              -- NULL = chưa gửi được email cho admin
  created_at           TEXT NOT NULL,
  created_by           TEXT,
  updated_at           TEXT NOT NULL,
  updated_by           TEXT
);
CREATE UNIQUE INDEX fbk_ticket_request_uq ON fbk_ticket(submitter_id, client_request_id);
CREATE INDEX fbk_ticket_activity_ix ON fbk_ticket(last_activity_at DESC);
CREATE INDEX fbk_ticket_submitter_ix ON fbk_ticket(submitter_id, created_at);

CREATE TABLE fbk_message (
  id         TEXT PRIMARY KEY,
  ticket_id  TEXT NOT NULL REFERENCES fbk_ticket(id),
  author_id  TEXT NOT NULL,                                                               -- WHO: không khoá ngoại
  body       TEXT NOT NULL CHECK (length(trim(body)) BETWEEN 1 AND 4000),
  internal   INTEGER NOT NULL DEFAULT 0 CHECK (internal IN (0, 1)),                       -- 1 = ghi chú nội bộ, chỉ admin thấy
  created_at TEXT NOT NULL,
  created_by TEXT,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);
CREATE INDEX fbk_message_ticket_ix ON fbk_message(ticket_id, created_at);
CREATE INDEX fbk_message_author_ix ON fbk_message(author_id, created_at);
```

- [ ] **Step 2: Cập nhật sổ dữ liệu**

Trong `docs/data-dictionary.json`: thêm `"feedback"` vào mảng `modules` (giữ thứ tự chữ cái: sau `company`), và thêm vào mảng `tables` bốn mục (đặt cùng cách trình bày với các mục `pty_*`):

```json
{ "name": "fbk_kind", "module": "feedback", "kind": "lookup" },
{ "name": "fbk_status", "module": "feedback", "kind": "lookup" },
{ "name": "fbk_ticket", "module": "feedback", "kind": "table" },
{ "name": "fbk_message", "module": "feedback", "kind": "table" }
```

(Nếu mục `pty_*` trong file còn khoá khác — ví dụ mô tả — chép cùng khoá; chạy `npm run dict` sẽ báo nếu thiếu.)

- [ ] **Step 3: Sinh lại tài liệu và chạy kiểm**

Run: `npm run dict && node --test src/architecture.test.ts src/modules/feedback/rules.test.ts`
Expected: bài kiểm sổ ↔ schema, tiền tố bảng, cột kiểm toán, khoá ngoại xanh; test "bảng tra cứu trong migration" của `rules.test.ts` xanh. Còn có thể đỏ: "module không nghiêm phải nằm trong LEGACY" (chưa có `STRICT`) — Task 5 xử lý.

- [ ] **Step 4: Thử migration trên D1 local**

Run: `npx wrangler d1 migrations apply tourdao-sales-db --local`
Expected: áp `0016_feedback.sql` thành công (đợi tới Task 8 mới đụng dữ liệu; lệnh này chỉ kiểm cú pháp trên D1 thật).

- [ ] **Step 5: Commit**

```bash
git add migrations/0016_feedback.sql docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "Góp ý: migration 0016 (fbk_kind, fbk_status, fbk_ticket, fbk_message) + sổ dữ liệu

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Quyền, nhật ký, DTO

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`

**Interfaces:**
- Produces: thao tác `feedback.submit`, `feedback.view`, `feedback.triage` trong `MATRIX`; nhóm nhật ký `feedback` + 4 hành động; DTO `FeedbackTicketDto`, `FeedbackMessageDto`, `FeedbackContextDto`, `FeedbackCreateInput`, `FeedbackListResponse`, `FeedbackQueueResponse`, `FeedbackDetailResponse`, `FeedbackBadgeResponse`, `FeedbackStatRow`.

- [ ] **Step 1: Cập nhật test bản đồ quyền (đỏ)**

Trong `src/shared/permissions.test.ts`, thêm ba dòng vào cuối object `ADR` (sau dòng `"admin.manage"`) và đổi tên test:

```ts
  "feedback.submit": ["any", "any", "any", "any"],
  "feedback.view": ["own", "own", "any", "own"],
  "feedback.triage": ["none", "none", "any", "none"],
```

Đổi tiêu đề `test("bản đồ quyền khớp TỪNG Ô của ADR-0007 (17 thao tác × 4 quyền)"` thành `(… 20 thao tác × 4 quyền)` và thêm chú thích trên khối `ADR`: `// 3 dòng "feedback.*" là mở rộng của module Góp ý (spec 2026-09-21), không thuộc bảng ADR-0007 gốc.` Nếu file còn nơi khác nhắc số "17", sửa cho khớp (`grep -n "17" src/shared/permissions.test.ts`).

Run: `node --test src/shared/permissions.test.ts`
Expected: FAIL (MATRIX thiếu 3 thao tác).

- [ ] **Step 2: Thêm ba ô vào `MATRIX`**

Trong `src/shared/permissions.ts`, thêm sau dòng `"admin.manage"`:

```ts
  "feedback.submit": row("any", "any", "any", "any"), // gửi báo lỗi/đề xuất (mọi tài khoản đăng nhập)
  "feedback.view": row("own", "own", "any", "own"), // xem yêu cầu: người thường chỉ của mình (ownerId = người gửi)
  "feedback.triage": row("none", "none", "any", "none"), // tiếp nhận: đổi trạng thái/người xử lý, ghi chú nội bộ, hàng đợi
```

và cập nhật chú thích đầu `MATRIX`: `Bản đồ ADR-0007 điều 1 + 3 thao tác Góp ý (feedback.*)`.

Run: `node --test src/shared/permissions.test.ts`
Expected: PASS.

- [ ] **Step 3: Nhật ký**

Trong `src/shared/audit-actions.ts`: thêm nhóm vào `AUDIT_GROUPS` (sau `location`):

```ts
  feedback: "Góp ý",
```

và thêm vào `AUDIT_ACTIONS` (sau `catalog_unhidden`):

```ts
  feedback_created: { label: "Gửi yêu cầu góp ý", group: "feedback" },
  feedback_replied: { label: "Trả lời yêu cầu góp ý", group: "feedback" },
  feedback_status_changed: { label: "Đổi trạng thái yêu cầu góp ý", group: "feedback" },
  feedback_assigned: { label: "Đổi người xử lý yêu cầu góp ý", group: "feedback" },
```

Run: `node --test src/shared/audit-actions.test.ts`
Expected: PASS (nếu test đếm số hành động/nhóm cứng thì sửa con số cho khớp).

- [ ] **Step 4: DTO**

Thêm vào cuối `src/shared/contracts.ts`:

```ts
// ---- Góp ý / Báo lỗi (module feedback) ----
import type { FeedbackKind, FeedbackStatus } from "./feedback-catalog";
export type { FeedbackKind, FeedbackStatus };

export interface FeedbackContextDto {
  path?: string;
  orderCode?: string;
  device?: string;
  standalone?: boolean;
  appVersion?: string;
}

export interface FeedbackCreateInput {
  kind: FeedbackKind;
  title: string;
  body: string;
  /** UUID sinh một lần khi mở form; gửi lại cùng mã thì trả yêu cầu cũ (chống trùng khi mạng yếu). */
  clientRequestId: string;
  context?: FeedbackContextDto;
}

export interface FeedbackTicketDto {
  id: string;
  /** Mã người đọc, vd YC-0007. */
  code: string;
  kind: FeedbackKind;
  kindName: string;
  status: FeedbackStatus;
  statusName: string;
  title: string;
  context: FeedbackContextDto;
  submitterId: string;
  submitterName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  resolvedIn: string | null;
  lastActivityAt: string;
  lastPublicReplyAt: string | null;
  createdAt: string;
  /** Có gì mới người xem chưa đọc (chấm đỏ). */
  unread: boolean;
  /** Chỉ admin thấy: true = email báo admin chưa gửi được. */
  mailPending: boolean;
}

export interface FeedbackMessageDto {
  id: string;
  authorId: string;
  authorName: string | null;
  body: string;
  internal: boolean;
  createdAt: string;
  mine: boolean;
}

export interface FeedbackStatRow {
  /** Tuần theo strftime('%Y-%W') của created_at. */
  week: string;
  kind: FeedbackKind;
  status: FeedbackStatus;
  count: number;
}

export interface FeedbackListResponse {
  tickets: FeedbackTicketDto[];
}
export interface FeedbackQueueResponse extends FeedbackListResponse {
  stats: FeedbackStatRow[];
}
export interface FeedbackDetailResponse {
  ticket: FeedbackTicketDto;
  messages: FeedbackMessageDto[];
  canTriage: boolean;
}
export interface FeedbackBadgeResponse {
  /** Số yêu cầu CỦA TÔI có phản hồi mới. */
  mine: number;
  /** Số yêu cầu chờ admin (0 với người không phải admin). */
  queue: number;
}
```

(Nếu `contracts.ts` đã có khối `import` ở đầu file và quy ước không import giữa dòng, chuyển dòng `import type` lên đầu file.)

- [ ] **Step 5: Kiểm kiểu và commit**

Run: `npm run typecheck && node --test src/shared/*.test.ts`
Expected: 0 lỗi kiểu; test shared xanh.

```bash
git add src/shared/permissions.ts src/shared/permissions.test.ts src/shared/audit-actions.ts src/shared/contracts.ts
git commit -m "Góp ý: quyền feedback.*, nhóm/hành động nhật ký, DTO

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `repository.ts` (SQL) + module nghiêm

**Files:**
- Create: `src/modules/feedback/repository.ts`
- Modify: `src/architecture.test.ts` (thêm vào `STRICT`)

**Interfaces:**
- Consumes: `defineSql` (`src/shared/sql-registry.ts`); `TicketInput`, `MessageInput`, `PatchInput` (Task 3).
- Produces (Task 7 dùng): các hàm dưới đây, tất cả nhận `db: D1Database` đầu tiên.

```ts
export interface TicketRow { id; seq; kind_code; kind_name; status_code; status_name; title; context; submitter_id; submitter_name: string|null; assignee_id: string|null; assignee_name: string|null; resolved_in: string|null; last_activity_at; last_public_reply_at: string|null; notified_at: string|null; created_at; updated_at; unread: number }
export interface MessageRow { id; author_id; author_name: string|null; body; internal: number; created_at }
export const getTicket(db, id): Promise<TicketRow | null>
export const findByRequest(db, submitterId, clientRequestId): Promise<{ id: string } | null>
export const messageExists(db, id): Promise<boolean>
export const insertTicketStatement(db, a): D1PreparedStatement
export const insertFirstMessageStatement(db, a): D1PreparedStatement
export const insertReplyStatement(db, a): D1PreparedStatement
export const touchAfterReplyStatement(db, a): D1PreparedStatement
export const patchTicketStatement(db, a): D1PreparedStatement
export const listMine(db, staffId, limit, offset): Promise<TicketRow[]>
export const listQueue(db, staffId, status: string|null, kind: string|null, limit, offset): Promise<TicketRow[]>
export const listMessages(db, ticketId, includeInternal: boolean): Promise<MessageRow[]>
export const markSeen(db, id, asSubmitter: boolean, asAdmin: boolean, now: string): Promise<void>
export const badgeCounts(db, staffId, isAdmin: boolean): Promise<{ mine: number; queue: number }>
export const weeklyStats(db, sinceIso: string): Promise<{ week: string; kind_code: string; status_code: string; n: number }[]>
export const setNotified(db, id, at: string | null): Promise<void>
```

- [ ] **Step 1: Cài đặt**

```ts
// src/modules/feedback/repository.ts
// SQL của các bảng module feedback sở hữu (fbk_*). Mọi câu đi qua defineSql (ADR-0002 điều 8(b)); câu SQL TĨNH, tham số đánh số ?N.
// Tên người đọc CHỈ qua view công bố v_stf_staff_label (module staff). Không có DELETE (R-N1-9).
import { defineSql } from "../../shared/sql-registry.ts";

export interface TicketRow {
  id: string;
  seq: number;
  kind_code: string;
  kind_name: string;
  status_code: string;
  status_name: string;
  title: string;
  context: string;
  submitter_id: string;
  submitter_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
  resolved_in: string | null;
  last_activity_at: string;
  last_public_reply_at: string | null;
  notified_at: string | null;
  created_at: string;
  updated_at: string;
  unread: number;
}
export interface MessageRow {
  id: string;
  author_id: string;
  author_name: string | null;
  body: string;
  internal: number;
  created_at: string;
}

const COLS = `t.id, t.seq, t.kind_code, k.name AS kind_name, t.status_code, st.name AS status_name, t.title, t.context, t.submitter_id,
  s.label AS submitter_name, t.assignee_id, a.label AS assignee_name, t.resolved_in, t.last_activity_at, t.last_public_reply_at, t.notified_at,
  t.created_at, t.updated_at`;
const FROM = `FROM fbk_ticket t JOIN fbk_kind k ON k.code = t.kind_code JOIN fbk_status st ON st.code = t.status_code
  LEFT JOIN v_stf_staff_label s ON s.id = t.submitter_id LEFT JOIN v_stf_staff_label a ON a.id = t.assignee_id`;

// "Chưa đọc" theo người xem: người gửi → có phản hồi công khai mới hơn lần xem của họ; admin → có hoạt động mới hơn lần xem của admin.
const UNREAD_SUBMITTER = `(t.last_public_reply_at IS NOT NULL AND (t.submitter_seen_at IS NULL OR t.last_public_reply_at > t.submitter_seen_at))`;
const UNREAD_ADMIN = `(t.admin_seen_at IS NULL OR t.last_activity_at > t.admin_seen_at)`;

// ---- Đọc -----------------------------------------------------------------------------------------------------------
const GET = defineSql("feedback", "get", `SELECT ${COLS}, 0 AS unread ${FROM} WHERE t.id = ?1`);
const FIND_BY_REQUEST = defineSql("feedback", "find_by_request", `SELECT id FROM fbk_ticket WHERE submitter_id = ?1 AND client_request_id = ?2`);
const MESSAGE_EXISTS = defineSql("feedback", "message_exists", `SELECT 1 AS ok FROM fbk_message WHERE id = ?1`);

// PHẠM VI XEM Ở MỘT NƠI (spec "scopeWhere"): người thường chỉ thấy yêu cầu của mình (?1 = id người xem, cả hai danh sách).
const LIST_MINE = defineSql(
  "feedback",
  "list_mine",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_SUBMITTER} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE t.submitter_id = ?1 ORDER BY t.last_activity_at DESC LIMIT ?2 OFFSET ?3`,
);
// Hàng đợi: CHỈ route admin gọi. ?2 trạng thái, ?3 loại (NULL = tất cả), ?4 giới hạn, ?5 vị trí bắt đầu.
const LIST_QUEUE = defineSql(
  "feedback",
  "list_queue",
  `SELECT ${COLS}, CASE WHEN ${UNREAD_ADMIN} THEN 1 ELSE 0 END AS unread ${FROM}
   WHERE (?2 IS NULL OR t.status_code = ?2) AND (?3 IS NULL OR t.kind_code = ?3) AND ?1 IS NOT NULL
   ORDER BY t.last_activity_at DESC LIMIT ?4 OFFSET ?5`,
);
const LIST_MESSAGES = defineSql(
  "feedback",
  "list_messages",
  `SELECT m.id, m.author_id, s.label AS author_name, m.body, m.internal, m.created_at
   FROM fbk_message m LEFT JOIN v_stf_staff_label s ON s.id = m.author_id
   WHERE m.ticket_id = ?1 AND (?2 = 1 OR m.internal = 0) ORDER BY m.created_at, m.rowid`,
);
// ?1 = id người xem, ?2 = 1 nếu là admin.
const BADGE = defineSql(
  "feedback",
  "badge",
  `SELECT
     (SELECT count(*) FROM fbk_ticket t WHERE t.submitter_id = ?1 AND ${UNREAD_SUBMITTER}) AS mine,
     (SELECT count(*) FROM fbk_ticket t WHERE ?2 = 1 AND ${UNREAD_ADMIN}) AS queue`,
);
const STATS = defineSql(
  "feedback",
  "stats",
  `SELECT strftime('%Y-%W', created_at) AS week, kind_code, status_code, count(*) AS n
   FROM fbk_ticket WHERE created_at >= ?1 GROUP BY 1, 2, 3 ORDER BY 1 DESC, 2, 3`,
);

export const getTicket = (db: D1Database, id: string) => db.prepare(GET).bind(id).first<TicketRow>();
export const findByRequest = (db: D1Database, submitterId: string, clientRequestId: string) =>
  db.prepare(FIND_BY_REQUEST).bind(submitterId, clientRequestId).first<{ id: string }>();
export const messageExists = async (db: D1Database, id: string): Promise<boolean> => (await db.prepare(MESSAGE_EXISTS).bind(id).first()) !== null;
export const listMine = async (db: D1Database, staffId: string, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_MINE).bind(staffId, limit, offset).all<TicketRow>()).results;
export const listQueue = async (db: D1Database, staffId: string, status: string | null, kind: string | null, limit: number, offset: number): Promise<TicketRow[]> =>
  (await db.prepare(LIST_QUEUE).bind(staffId, status, kind, limit, offset).all<TicketRow>()).results;
export const listMessages = async (db: D1Database, ticketId: string, includeInternal: boolean): Promise<MessageRow[]> =>
  (await db.prepare(LIST_MESSAGES).bind(ticketId, includeInternal ? 1 : 0).all<MessageRow>()).results;
export async function badgeCounts(db: D1Database, staffId: string, isAdmin: boolean): Promise<{ mine: number; queue: number }> {
  const r = await db.prepare(BADGE).bind(staffId, isAdmin ? 1 : 0).first<{ mine: number; queue: number }>();
  return { mine: r?.mine ?? 0, queue: r?.queue ?? 0 };
}
export const weeklyStats = async (db: D1Database, sinceIso: string) =>
  (await db.prepare(STATS).bind(sinceIso).all<{ week: string; kind_code: string; status_code: string; n: number }>()).results;

// ---- Ghi -----------------------------------------------------------------------------------------------------------
// Tạo yêu cầu: MỘT câu INSERT … SELECT … WHERE (đếm trong cửa sổ) < trần AND chưa có cùng (người gửi, client_request_id).
// Đếm và chèn trong cùng một câu lệnh nên hai request song song không cùng qua trần (D1 tuần tự hoá ghi). seq = max+1 cùng câu.
// ?1 id, ?2 loại, ?3 tiêu đề, ?4 context JSON, ?5 người gửi, ?6 client_request_id, ?7 bây giờ, ?8 đầu cửa sổ, ?9 trần.
const INSERT_TICKET = defineSql(
  "feedback",
  "insert_ticket",
  `INSERT INTO fbk_ticket (id, seq, kind_code, status_code, title, context, submitter_id, client_request_id, last_activity_at, created_at, created_by, updated_at, updated_by)
   SELECT ?1, COALESCE((SELECT max(seq) FROM fbk_ticket), 0) + 1, ?2, 'NEW', ?3, ?4, ?5, ?6, ?7, ?7, ?5, ?7, ?5
   WHERE (SELECT count(*) FROM fbk_ticket WHERE submitter_id = ?5 AND created_at > ?8) < ?9
     AND NOT EXISTS (SELECT 1 FROM fbk_ticket WHERE submitter_id = ?5 AND client_request_id = ?6)`,
);
// Tin mô tả ban đầu: chỉ chèn khi yêu cầu ?2 (vừa chèn ở câu trước) có mặt. ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 bây giờ.
const INSERT_FIRST_MESSAGE = defineSql(
  "feedback",
  "insert_first_message",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, 0, ?5, ?3, ?5, ?3 WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2)`,
);
// Trả lời: chèn khi yêu cầu có mặt VÀ dưới trần tin nhắn. ?1 id tin, ?2 id yêu cầu, ?3 tác giả, ?4 nội dung, ?5 internal 0/1, ?6 bây giờ, ?7 đầu cửa sổ, ?8 trần.
const INSERT_REPLY = defineSql(
  "feedback",
  "insert_reply",
  `INSERT INTO fbk_message (id, ticket_id, author_id, body, internal, created_at, created_by, updated_at, updated_by)
   SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?3, ?6, ?3
   WHERE EXISTS (SELECT 1 FROM fbk_ticket WHERE id = ?2)
     AND (SELECT count(*) FROM fbk_message WHERE author_id = ?3 AND created_at > ?7) < ?8`,
);
// Sau khi tin ?2 đã chèn: cập nhật mốc hoạt động. ?1 id yêu cầu, ?2 id tin, ?3 bây giờ, ?4 internal 0/1, ?5 tác giả.
// Người gửi trả lời → thấy mọi thứ của mình + mở lại nếu đã đóng (phản chiếu statusAfterSubmitterReply); admin trả lời → đã xem; công khai thì báo người gửi.
const TOUCH_AFTER_REPLY = defineSql(
  "feedback",
  "touch_after_reply",
  `UPDATE fbk_ticket SET
     last_activity_at = ?3,
     last_public_reply_at = CASE WHEN ?4 = 0 AND submitter_id <> ?5 THEN ?3 ELSE last_public_reply_at END,
     admin_seen_at = CASE WHEN submitter_id <> ?5 THEN ?3 ELSE admin_seen_at END,
     submitter_seen_at = CASE WHEN submitter_id = ?5 THEN ?3 ELSE submitter_seen_at END,
     status_code = CASE WHEN submitter_id = ?5 AND status_code IN ('DONE', 'DECLINED') THEN 'ACK' ELSE status_code END,
     updated_at = ?3, updated_by = ?5
   WHERE id = ?1 AND EXISTS (SELECT 1 FROM fbk_message WHERE id = ?2)`,
);
// Admin đổi trạng thái/người xử lý. ?1 id, ?2 trạng thái mới hoặc NULL, ?3 có đổi người xử lý (0/1), ?4 người xử lý mới, ?5 có đổi resolved_in (0/1),
// ?6 resolved_in mới, ?7 bây giờ, ?8 admin, ?9 trạng thái CŨ (khoá lạc quan: đã khác → 0 dòng đổi). Người xử lý mới phải là tài khoản đang hoạt động.
const PATCH_TICKET = defineSql(
  "feedback",
  "patch_ticket",
  `UPDATE fbk_ticket SET
     status_code = COALESCE(?2, status_code),
     assignee_id = CASE WHEN ?3 = 1 THEN ?4 ELSE assignee_id END,
     resolved_in = CASE WHEN ?5 = 1 THEN ?6 ELSE resolved_in END,
     last_activity_at = CASE WHEN ?2 IS NULL THEN last_activity_at ELSE ?7 END,
     last_public_reply_at = CASE WHEN ?2 IS NULL THEN last_public_reply_at ELSE ?7 END,
     admin_seen_at = CASE WHEN ?2 IS NULL THEN admin_seen_at ELSE ?7 END,
     updated_at = ?7, updated_by = ?8
   WHERE id = ?1 AND status_code = ?9
     AND (?3 = 0 OR ?4 IS NULL OR EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?4 AND active = 1))`,
);
// Đánh dấu đã xem. ?1 id, ?2 người xem là người gửi (0/1), ?3 người xem là admin (0/1), ?4 bây giờ. Không đổi updated_at.
const MARK_SEEN = defineSql(
  "feedback",
  "mark_seen",
  `UPDATE fbk_ticket SET
     submitter_seen_at = CASE WHEN ?2 = 1 THEN ?4 ELSE submitter_seen_at END,
     admin_seen_at = CASE WHEN ?3 = 1 THEN ?4 ELSE admin_seen_at END
   WHERE id = ?1`,
);
const SET_NOTIFIED = defineSql("feedback", "set_notified", `UPDATE fbk_ticket SET notified_at = ?2 WHERE id = ?1`);

export const insertTicketStatement = (
  db: D1Database,
  a: { id: string; kind: string; title: string; context: string; submitterId: string; clientRequestId: string; now: string; windowStart: string; limit: number },
) => db.prepare(INSERT_TICKET).bind(a.id, a.kind, a.title, a.context, a.submitterId, a.clientRequestId, a.now, a.windowStart, a.limit);
export const insertFirstMessageStatement = (db: D1Database, a: { id: string; ticketId: string; authorId: string; body: string; now: string }) =>
  db.prepare(INSERT_FIRST_MESSAGE).bind(a.id, a.ticketId, a.authorId, a.body, a.now);
export const insertReplyStatement = (
  db: D1Database,
  a: { id: string; ticketId: string; authorId: string; body: string; internal: boolean; now: string; windowStart: string; limit: number },
) => db.prepare(INSERT_REPLY).bind(a.id, a.ticketId, a.authorId, a.body, a.internal ? 1 : 0, a.now, a.windowStart, a.limit);
export const touchAfterReplyStatement = (db: D1Database, a: { ticketId: string; messageId: string; now: string; internal: boolean; authorId: string }) =>
  db.prepare(TOUCH_AFTER_REPLY).bind(a.ticketId, a.messageId, a.now, a.internal ? 1 : 0, a.authorId);
export const patchTicketStatement = (
  db: D1Database,
  a: { id: string; status: string | null; assignee?: { value: string | null }; resolvedIn?: { value: string | null }; now: string; adminId: string; fromStatus: string },
) =>
  db
    .prepare(PATCH_TICKET)
    .bind(a.id, a.status, a.assignee ? 1 : 0, a.assignee?.value ?? null, a.resolvedIn ? 1 : 0, a.resolvedIn?.value ?? null, a.now, a.adminId, a.fromStatus);
export const markSeen = async (db: D1Database, id: string, asSubmitter: boolean, asAdmin: boolean, now: string): Promise<void> => {
  if (!asSubmitter && !asAdmin) return;
  await db.prepare(MARK_SEEN).bind(id, asSubmitter ? 1 : 0, asAdmin ? 1 : 0, now).run();
};
export const setNotified = async (db: D1Database, id: string, at: string | null): Promise<void> => {
  await db.prepare(SET_NOTIFIED).bind(id, at).run();
};
```

- [ ] **Step 2: Đưa module vào danh sách "nghiêm"**

Trong `src/architecture.test.ts`, thêm vào mảng `STRICT`:

```ts
  { module: "feedback", file: "modules/feedback/repository.ts" },
```

- [ ] **Step 3: Chạy bài kiểm kiến trúc**

Run: `node --test src/architecture.test.ts`
Expected: PASS toàn bộ — đặc biệt "ranh giới SQL của module nghiêm" (chỉ chạm `fbk_*` + `v_stf_staff_label`), "không `.prepare(` chuỗi thô", "câu DELETE trên bảng mới". Nếu EXPLAIN báo chạm bảng lạ: kiểm lại tên bảng trong câu SQL vừa viết.

- [ ] **Step 4: Kiểm kiểu và commit**

Run: `npm run typecheck`
Expected: 0 lỗi.

```bash
git add src/modules/feedback/repository.ts src/architecture.test.ts
git commit -m "Góp ý: repository (SQL defineSql, INSERT có điều kiện chống spam) + khai module nghiêm

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Email `notify.ts`

**Files:**
- Create: `src/modules/feedback/notify.ts`
- Test: `src/modules/feedback/notify.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Mailer { send(msg: { to: string; from: string; subject: string; html: string }): Promise<unknown> }
export type NotifyEvent = { type: "created" | "user_replied"; code: string; kindName: string; title: string; submitterName: string; excerpt: string; url: string }
export interface MailDeps { mailer?: Mailer; to?: string; from?: string; setNotified(at: string | null): Promise<void>; now(): string; log(message: string, err?: unknown): void }
export function mailConfig(env: Env): { mailer?: Mailer; to?: string; from?: string }
export function buildMail(e: NotifyEvent): { subject: string; html: string }
export function notifyAdmins(deps: MailDeps, e: NotifyEvent): Promise<"sent" | "skipped" | "failed">
```

- [ ] **Step 1: Viết test (đỏ)**

```ts
// src/modules/feedback/notify.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildMail, notifyAdmins, type MailDeps, type NotifyEvent } from "./notify.ts";

const ev: NotifyEvent = { type: "created", code: "YC-0007", kindName: "Báo lỗi", title: "Lỗi <b>lưu</b>\r\nBcc: x@y.z", submitterName: "An & Bình", excerpt: "<script>alert(1)</script>", url: "https://booking.tourdao.vn/feedback?id=abc" };

function deps(over: Partial<MailDeps> = {}): { d: MailDeps; notified: (string | null)[]; logs: string[] } {
  const notified: (string | null)[] = [];
  const logs: string[] = [];
  const d: MailDeps = {
    mailer: { send: async () => ({}) },
    to: "admin@example.com",
    from: "hotro@example.com",
    setNotified: async (at) => void notified.push(at),
    now: () => "2026-09-21T10:00:00.000Z",
    log: (m) => void logs.push(m),
    ...over,
  };
  return { d, notified, logs };
}

test("buildMail: tiêu đề một dòng, nội dung HTML được thoát", () => {
  const m = buildMail(ev);
  assert.ok(!/[\r\n]/.test(m.subject), "tiêu đề không được chứa xuống dòng (chèn header)");
  assert.ok(m.subject.includes("YC-0007"));
  assert.ok(!m.html.includes("<script>") && !m.html.includes("<b>lưu</b>"));
  assert.ok(m.html.includes("&lt;script&gt;") && m.html.includes("An &amp; Bình"));
  assert.ok(m.html.includes(ev.url));
});

test("gửi được → đặt notified_at", async () => {
  const { d, notified } = deps();
  assert.equal(await notifyAdmins(d, ev), "sent");
  assert.deepEqual(notified, ["2026-09-21T10:00:00.000Z"]);
});

test("gửi lỗi → không ném, notified_at về NULL, có ghi log", async () => {
  const { d, notified, logs } = deps({ mailer: { send: async () => Promise.reject(new Error("beta hỏng")) } });
  assert.equal(await notifyAdmins(d, ev), "failed");
  assert.deepEqual(notified, [null]);
  assert.equal(logs.length, 1);
});

test("thiếu cấu hình (binding/địa chỉ nhận/địa chỉ gửi) → bỏ qua, notified_at NULL", async () => {
  for (const over of [{ mailer: undefined }, { to: undefined }, { from: undefined }] as Partial<MailDeps>[]) {
    const { d, notified } = deps(over);
    assert.equal(await notifyAdmins(d, ev), "skipped");
    assert.deepEqual(notified, [null]);
  }
});

test("setNotified ném lỗi cũng không làm hỏng luồng", async () => {
  const { d } = deps({ setNotified: async () => Promise.reject(new Error("D1 lỗi")) });
  assert.equal(await notifyAdmins(d, ev), "sent");
});
```

- [ ] **Step 2: Chạy, phải đỏ**

Run: `node --test src/modules/feedback/notify.test.ts`
Expected: FAIL (không tìm thấy `./notify.ts`).

- [ ] **Step 3: Cài đặt**

```ts
// src/modules/feedback/notify.ts
// Email báo admin. Mọi email đi qua notifyAdmins(); CHỈ trong đây mới đụng bộ gửi (env.EMAIL, Cloudflare Email Service — đang beta).
// Chạy trong ctx.exec.waitUntil nên tự bắt mọi lỗi và tự ghi kết quả (notified_at): lỗi gửi KHÔNG bao giờ làm hỏng yêu cầu đã lưu.

export interface Mailer {
  send(msg: { to: string; from: string; subject: string; html: string }): Promise<unknown>;
}

export interface NotifyEvent {
  type: "created" | "user_replied";
  code: string;
  kindName: string;
  title: string;
  submitterName: string;
  excerpt: string;
  url: string;
}

export interface MailDeps {
  mailer?: Mailer;
  to?: string;
  from?: string;
  setNotified(at: string | null): Promise<void>;
  now(): string;
  log(message: string, err?: unknown): void;
}

/** Đọc cấu hình từ môi trường. EMAIL là binding; hai địa chỉ là secret/biến (`wrangler secret put FEEDBACK_NOTIFY_EMAIL|FEEDBACK_MAIL_FROM`). Thiếu thì tính năng email tự tắt. */
export function mailConfig(env: Env): { mailer?: Mailer; to?: string; from?: string } {
  const e = env as unknown as { EMAIL?: Mailer; FEEDBACK_NOTIFY_EMAIL?: string; FEEDBACK_MAIL_FROM?: string };
  return { mailer: e.EMAIL, to: e.FEEDBACK_NOTIFY_EMAIL || undefined, from: e.FEEDBACK_MAIL_FROM || undefined };
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESC[c]!);
const oneLine = (s: string, max: number): string => s.replace(/[\r\n\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

export function buildMail(e: NotifyEvent): { subject: string; html: string } {
  const head = e.type === "created" ? "Yêu cầu mới" : "Người gửi vừa trả lời";
  const subject = oneLine(`[Góp ý] ${head} ${e.code}: ${e.title}`, 150);
  const html =
    `<p><strong>${esc(head)}</strong> — ${esc(e.code)} (${esc(e.kindName)})</p>` +
    `<p><strong>${esc(oneLine(e.title, 200))}</strong></p>` +
    `<p>Người gửi: ${esc(oneLine(e.submitterName, 100))}</p>` +
    `<blockquote>${esc(e.excerpt.slice(0, 500)).replace(/\n/g, "<br>")}</blockquote>` +
    `<p><a href="${esc(e.url)}">Mở trong app</a></p>`;
  return { subject, html };
}

export async function notifyAdmins(deps: MailDeps, e: NotifyEvent): Promise<"sent" | "skipped" | "failed"> {
  const record = async (at: string | null) => {
    try {
      await deps.setNotified(at);
    } catch (err) {
      deps.log("Không ghi được notified_at", err);
    }
  };
  if (!deps.mailer || !deps.to || !deps.from) {
    await record(null);
    return "skipped";
  }
  try {
    const { subject, html } = buildMail(e);
    await deps.mailer.send({ to: deps.to, from: deps.from, subject, html });
  } catch (err) {
    deps.log(`Gửi email báo admin thất bại (${e.code})`, err);
    await record(null);
    return "failed";
  }
  await record(deps.now());
  return "sent";
}
```

- [ ] **Step 4: Chạy, phải xanh**

Run: `node --test src/modules/feedback/notify.test.ts`
Expected: 5 test PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/feedback/notify.ts src/modules/feedback/notify.test.ts
git commit -m "Góp ý: notifyAdmins (email inject được, lỗi gửi không làm hỏng yêu cầu)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Route `index.ts` + đăng ký module + e2e

**Files:**
- Create: `src/modules/feedback/index.ts`, `tests/e2e/feedback.mjs`
- Modify: `src/index.ts`, `tests/e2e/run.mjs`

**Interfaces:**
- Consumes: mọi thứ của Task 2–7; `auditStatement` từ `../audit`; `route`, `AppModule` từ `../../shared/router`; `json`, `error`, `readJson`, `UUID_RE`, `intParam` từ `../../shared/http`; `can` từ `../../shared/permissions`.
- Produces: `feedbackModule: AppModule` với các route đúng bảng API của spec.

- [ ] **Step 1: Viết e2e trước (đỏ)**

```js
// tests/e2e/feedback.mjs
// Góp ý / Báo lỗi trên route thật: quyền xem, ghi chú nội bộ, bảng chuyển trạng thái, idempotency, trần tần suất (kể cả song song), chấm đỏ.
// Local không có binding EMAIL → mailPending phải là true (tài liệu hoá hành vi "chưa gửi được mail").
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

const input = (over = {}) => ({ kind: "BUG", title: "Nút lưu không bấm được", body: "Bấm Lưu không thấy gì.", clientRequestId: randomUUID(), context: { path: "/order", device: "iPhone Safari", standalone: true, appVersion: "dev", evil: "x" }, ...over });
let r;

// --- Chưa đăng nhập / đầu vào sai
assert.equal((await call(null, "GET", "/api/feedback/mine")).status, 401);
assert.equal((await call(null, "POST", "/api/feedback", input())).status, 401);
for (const bad of [input({ kind: "X" }), input({ title: "  " }), input({ body: "" }), input({ clientRequestId: "abc" })]) {
  assert.equal((await call(SALES, "POST", "/api/feedback", bad)).status, 400, JSON.stringify(bad).slice(0, 80));
}
console.log("✓ 401 khi chưa đăng nhập, 400 khi đầu vào sai");

// --- Tạo + idempotency + lọc context
const first = input();
r = await call(SALES, "POST", "/api/feedback", first);
assert.equal(r.status, 201, JSON.stringify(r.body));
const t = r.body.ticket;
assert.match(t.code, /^YC-\d{4}$/);
assert.equal(t.status, "NEW");
assert.equal(t.submitterName, ACCOUNTS.salesA.name);
assert.deepEqual(t.context, { path: "/order", device: "iPhone Safari", standalone: true, appVersion: "dev" }, "khoá lạ bị bỏ");
r = await call(SALES, "POST", "/api/feedback", first);
assert.equal(r.status, 200, "gửi lại cùng clientRequestId: trả yêu cầu cũ");
assert.equal(r.body.ticket.id, t.id);
r = await call(SALES, "GET", "/api/feedback/mine");
assert.equal(r.status, 200);
assert.equal(r.body.tickets.filter((x) => x.id === t.id).length, 1, "không tạo bản thứ hai");
console.log("✓ tạo yêu cầu, gửi lại không tạo trùng, context được lọc");

// --- Quyền xem: người khác không thấy (404 để không lộ sự tồn tại); admin thấy; FIELD gửi được
assert.equal((await call(SALES_B, "GET", `/api/feedback/${t.id}`)).status, 404);
assert.equal((await call(SALES_B, "POST", `/api/feedback/${t.id}/messages`, { body: "chen ngang" })).status, 404);
assert.equal((await call(ACC, "GET", `/api/feedback/${t.id}`)).status, 404);
assert.equal((await call(ADMIN, "GET", `/api/feedback/${t.id}`)).status, 200);
assert.equal((await call(FIELD, "POST", "/api/feedback", input({ title: "FIELD góp ý" }))).status, 201, "mọi quyền đều được gửi");
assert.equal((await call(SALES, "GET", "/api/feedback")).status, 403, "hàng đợi chỉ admin");
assert.equal((await call(FIELD, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" })).status, 403);
assert.equal((await call(SALES, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" })).status, 403);
console.log("✓ chỉ chủ và admin xem được; hàng đợi/đổi trạng thái chỉ admin");

// --- Hàng đợi admin: có yêu cầu, chưa gửi được mail (không có binding), có thống kê
r = await call(ADMIN, "GET", "/api/feedback");
assert.equal(r.status, 200);
const inQueue = r.body.tickets.find((x) => x.id === t.id);
assert.ok(inQueue, "yêu cầu có trong hàng đợi");
assert.equal(inQueue.mailPending, true, "local không có binding EMAIL → chưa gửi được mail");
assert.ok(inQueue.unread, "admin chưa xem → chưa đọc");
assert.ok(Array.isArray(r.body.stats) && r.body.stats.length >= 1);
r = await call(ADMIN, "GET", "/api/feedback?status=NEW&kind=BUG");
assert.equal(r.status, 200);
assert.equal((await call(ADMIN, "GET", "/api/feedback?status=LẠ")).status, 400);
console.log("✓ hàng đợi admin: mailPending, chưa đọc, thống kê, lọc");

// --- Chấm đỏ
r = await call(ADMIN, "GET", "/api/feedback/badge");
assert.ok(r.body.queue >= 1);
await call(ADMIN, "GET", `/api/feedback/${t.id}`); // admin xem → đánh dấu đã xem
r = await call(ADMIN, "GET", "/api/feedback");
assert.equal(r.body.tickets.find((x) => x.id === t.id).unread, false, "admin đã xem");
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.queue, 0, "người thường không có hàng đợi");
console.log("✓ chấm đỏ admin giảm sau khi xem");

// --- Chuyển trạng thái: hợp lệ và không hợp lệ
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "DONE" });
assert.equal(r.status, 409, "NEW → DONE không hợp lệ");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.ticket.status, "ACK");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "ACK" });
assert.equal(r.status, 409, "ACK → ACK không hợp lệ (cũng là trường hợp đổi từ trạng thái đã khác)");
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "CLOSED" })).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, {})).status, 400);
assert.equal((await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { assigneeId: randomUUID() })).status, 400, "người xử lý không tồn tại");
r = await call(ADMIN, "PATCH", `/api/feedback/${t.id}`, { status: "DONE", resolvedIn: "20260921120000" });
assert.equal(r.status, 200);
assert.equal(r.body.ticket.resolvedIn, "20260921120000");
console.log("✓ chuyển trạng thái theo bảng luật; sai → 409/400");

// --- Phản hồi công khai → chấm đỏ người gửi; ghi chú nội bộ ẩn với người gửi; người gửi trả lời → mở lại
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.mine, 1, "admin đổi trạng thái (công khai) → người gửi có tin mới");
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.equal(r.status, 200);
r = await call(SALES, "GET", "/api/feedback/badge");
assert.equal(r.body.mine, 0, "xem xong hết chấm đỏ");
r = await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "ghi chú lén", internal: true });
assert.equal(r.status, 403, "người gửi không đặt được ghi chú nội bộ");
r = await call(ADMIN, "POST", `/api/feedback/${t.id}/messages`, { body: "Ghi chú nội bộ: kiểm tra log", internal: true });
assert.equal(r.status, 201);
r = await call(ADMIN, "POST", `/api/feedback/${t.id}/messages`, { body: "Đã sửa, bạn thử lại nhé." });
assert.equal(r.status, 201);
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.deepEqual(r.body.messages.map((m) => m.internal), [false, false], "người gửi chỉ thấy tin công khai (mô tả + phản hồi)");
assert.ok(!r.body.messages.some((m) => m.body.includes("nội bộ")));
assert.equal(r.body.canTriage, false);
r = await call(ADMIN, "GET", `/api/feedback/${t.id}`);
assert.equal(r.body.messages.length, 3);
assert.equal(r.body.canTriage, true);
r = await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "Vẫn lỗi." });
assert.equal(r.status, 201);
r = await call(SALES, "GET", `/api/feedback/${t.id}`);
assert.equal(r.body.ticket.status, "ACK", "người gửi trả lời khi đã DONE → mở lại thành ACK");
assert.equal((await call(SALES, "POST", `/api/feedback/${t.id}/messages`, { body: "  " })).status, 400);
console.log("✓ tin nội bộ ẩn, người gửi trả lời mở lại yêu cầu");

// --- Nhật ký
r = await call(ADMIN, "GET", "/api/audit?action=feedback_created");
assert.equal(r.status, 200);
r = await call(ADMIN, "GET", "/api/audit?action=feedback_status_changed");
assert.equal(r.status, 200);
console.log("✓ nhật ký nhận hành động feedback_*");

// --- Trần tần suất, kể cả gửi SONG SONG: đúng 5 yêu cầu mới/giờ
const burst = await Promise.all(Array.from({ length: 8 }, (_, i) => call(ACC, "POST", "/api/feedback", input({ title: `Dồn dập ${i}` }))));
const created = burst.filter((x) => x.status === 201).length;
assert.equal(created, 5, `song song 8 lần: đúng 5 được tạo, thực tế ${created} (${burst.map((x) => x.status)})`);
assert.ok(burst.every((x) => x.status === 201 || x.status === 429));
console.log("✓ trần 5 yêu cầu/giờ giữ được khi gửi song song");

// --- Trần tin nhắn: 30/giờ gồm tin mô tả ban đầu → tài khoản FIELD (đã có 1 tin) chỉ thêm được 29
r = await call(FIELD, "GET", "/api/feedback/mine");
const own = r.body.tickets[0];
const replies = await Promise.all(Array.from({ length: 35 }, (_, i) => call(FIELD, "POST", `/api/feedback/${own.id}/messages`, { body: `tin ${i}` })));
const okReplies = replies.filter((x) => x.status === 201).length;
assert.equal(okReplies, 29, `song song 35 tin: đúng 29 được nhận (30 − 1 tin mô tả), thực tế ${okReplies}`);
assert.ok(replies.every((x) => x.status === 201 || x.status === 429));
console.log("✓ trần 30 tin/giờ giữ được khi gửi song song");

console.log("feedback: OK");
```

Thêm `"feedback"` vào mảng `ALL` trong `tests/e2e/run.mjs` (sau `"permissions"`).

- [ ] **Step 2: Chạy, phải đỏ**

Run: `npm run test:e2e -- feedback`
Expected: FAIL (route chưa có → 404 ở lần gọi đầu, hoặc lỗi 401 assert).

- [ ] **Step 3: Cài đặt `index.ts`**

```ts
// src/modules/feedback/index.ts
// Module feedback — Góp ý / Báo lỗi (ticket): người dùng gửi, admin tiếp nhận/trả lời/đổi trạng thái. Route: /api/feedback*.
// Phụ thuộc: staff (tên qua view công bố — chỉ trong repository) và audit (dấu vết). Module khác CHỈ import từ file này.
import { auditStatement } from "../audit";
import type {
  FeedbackBadgeResponse, FeedbackDetailResponse, FeedbackMessageDto, FeedbackQueueResponse, FeedbackTicketDto,
} from "../../shared/contracts";
import { FEEDBACK_KIND_NAME, FEEDBACK_STATUS_NAME, canTransition, feedbackCode, isFeedbackKind, isFeedbackStatus, type FeedbackKind, type FeedbackStatus } from "../../shared/feedback-catalog";
import { UUID_RE, error, intParam, json, readJson } from "../../shared/http";
import { can, type PermissionHolder } from "../../shared/permissions";
import { route, type AppModule } from "../../shared/router";
import { mailConfig, notifyAdmins, type NotifyEvent } from "./notify";
import {
  badgeCounts, findByRequest, getTicket, insertFirstMessageStatement, insertReplyStatement, insertTicketStatement, listMessages, listMine, listQueue, markSeen,
  messageExists, patchTicketStatement, setNotified, touchAfterReplyStatement, weeklyStats, type MessageRow, type TicketRow,
} from "./repository";
import {
  MESSAGE_LIMIT_PER_HOUR, TICKET_LIMIT_PER_HOUR, parseContext, validateMessageInput, validatePatchInput, validateTicketInput, windowStart,
} from "./rules";

const NOT_FOUND = () => error(404, "not_found", "Không tìm thấy yêu cầu.");
const RATE_LIMITED = () => error(429, "rate_limited", "Bạn gửi quá nhiều trong một giờ, hãy thử lại sau.");
const BAD_JSON = () => error(400, "invalid_input", "Nội dung gửi lên không hợp lệ.");

const toTicket = (r: TicketRow, showMail: boolean): FeedbackTicketDto => ({
  id: r.id,
  code: feedbackCode(r.seq),
  kind: r.kind_code as FeedbackKind,
  kindName: r.kind_name,
  status: r.status_code as FeedbackStatus,
  statusName: r.status_name,
  title: r.title,
  context: parseContext(r.context),
  submitterId: r.submitter_id,
  submitterName: r.submitter_name,
  assigneeId: r.assignee_id,
  assigneeName: r.assignee_name,
  resolvedIn: r.resolved_in,
  lastActivityAt: r.last_activity_at,
  lastPublicReplyAt: r.last_public_reply_at,
  createdAt: r.created_at,
  unread: r.unread === 1,
  mailPending: showMail && r.notified_at === null,
});
const toMessage = (m: MessageRow, viewerId: string): FeedbackMessageDto => ({
  id: m.id,
  authorId: m.author_id,
  authorName: m.author_name,
  body: m.body,
  internal: m.internal === 1,
  createdAt: m.created_at,
  mine: m.author_id === viewerId,
});

/** Ai xem được yêu cầu: chủ (feedback.view ô `own`) hoặc admin (ô `any`). Người khác nhận 404, không lộ sự tồn tại. */
const canRead = (who: PermissionHolder, submitterId: string): boolean => can(who, "feedback.view", { ownerId: submitterId });

async function detail(db: D1Database, who: PermissionHolder, id: string): Promise<FeedbackDetailResponse | null> {
  const t = await getTicket(db, id);
  if (!t || !canRead(who, t.submitter_id)) return null;
  const triage = can(who, "feedback.triage");
  return { ticket: toTicket(t, triage), messages: (await listMessages(db, id, triage)).map((m) => toMessage(m, who.id)), canTriage: triage };
}

/** Email báo admin sau khi D1 đã ghi; lỗi không làm hỏng yêu cầu (xem notify.ts). */
function scheduleMail(env: Env, exec: ExecutionContext, request: Request, ticketId: string, event: Omit<NotifyEvent, "url">): void {
  const cfg = mailConfig(env);
  const url = `${new URL(request.url).origin}/feedback?id=${ticketId}`;
  exec.waitUntil(
    notifyAdmins(
      { ...cfg, setNotified: (at) => setNotified(env.DB, ticketId, at), now: () => new Date().toISOString(), log: (m, e) => console.error(m, e) },
      { ...event, url },
    ).then(() => undefined),
  );
}

export const feedbackModule: AppModule = {
  name: "feedback",
  routes: [
    // Tạo yêu cầu. Idempotent theo clientRequestId; trần 5/giờ bằng INSERT có điều kiện (xem repository.ts).
    route("POST", "/api/feedback", "staff", async ({ request, env, exec, staff }) => {
      if (!can(staff, "feedback.submit")) return error(403, "forbidden", "Không có quyền gửi yêu cầu.");
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateTicketInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const now = new Date();
      const at = now.toISOString();
      const id = crypto.randomUUID();
      await env.DB.batch([
        insertTicketStatement(env.DB, { id, kind: v.value.kind, title: v.value.title, context: v.value.context, submitterId: staff.id, clientRequestId: v.value.clientRequestId, now: at, windowStart: windowStart(now), limit: TICKET_LIMIT_PER_HOUR }),
        insertFirstMessageStatement(env.DB, { id: crypto.randomUUID(), ticketId: id, authorId: staff.id, body: v.value.body, now: at }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_created", at, targetType: "feedback", targetId: id, detail: v.value.title.slice(0, 100) }, `EXISTS (SELECT 1 FROM fbk_ticket WHERE id = '${id}')`),
      ]);
      const mine = await findByRequest(env.DB, staff.id, v.value.clientRequestId);
      if (!mine) return RATE_LIMITED(); // không chèn được và cũng không phải gửi lại → chạm trần
      const d = await detail(env.DB, staff, mine.id);
      if (!d) return NOT_FOUND();
      if (mine.id !== id) return json(d, 200); // gửi lại cùng clientRequestId: trả yêu cầu cũ, không gửi email lần nữa
      scheduleMail(env, exec, request, id, {
        type: "created", code: d.ticket.code, kindName: FEEDBACK_KIND_NAME[d.ticket.kind], title: d.ticket.title, submitterName: staff.fullName, excerpt: v.value.body,
      });
      return json(d, 201);
    }),

    // Tuyến TĨNH khai trước tuyến có :id để "mine"/"badge" không bị hiểu là id.
    route("GET", "/api/feedback/mine", "staff", async ({ env, staff, url }) => {
      const rows = await listMine(env.DB, staff.id, intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000));
      return json({ tickets: rows.map((r) => toTicket(r, false)) });
    }),
    route("GET", "/api/feedback/badge", "staff", async ({ env, staff }) => {
      const b = await badgeCounts(env.DB, staff.id, can(staff, "feedback.triage"));
      return json(b satisfies FeedbackBadgeResponse);
    }),

    // Hàng đợi (admin).
    route("GET", "/api/feedback", "admin", async ({ env, staff, url }) => {
      const status = url.searchParams.get("status");
      const kind = url.searchParams.get("kind");
      if ((status !== null && !isFeedbackStatus(status)) || (kind !== null && !isFeedbackKind(kind))) return error(400, "invalid_input", "Bộ lọc không hợp lệ.");
      const since = new Date(Date.now() - 8 * 7 * 24 * 60 * 60 * 1000).toISOString();
      const [rows, stats] = await Promise.all([
        listQueue(env.DB, staff.id, status, kind, intParam(url.searchParams.get("limit"), 50, 1, 100), intParam(url.searchParams.get("offset"), 0, 0, 100000)),
        weeklyStats(env.DB, since),
      ]);
      return json({
        tickets: rows.map((r) => toTicket(r, true)),
        stats: stats.map((s) => ({ week: s.week, kind: s.kind_code as FeedbackKind, status: s.status_code as FeedbackStatus, count: s.n })),
      } satisfies FeedbackQueueResponse);
    }),

    route("GET", "/api/feedback/:id", "staff", async ({ env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t || !canRead(staff, t.submitter_id)) return NOT_FOUND();
      await markSeen(env.DB, id, t.submitter_id === staff.id, can(staff, "feedback.triage"), new Date().toISOString());
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),

    route("POST", "/api/feedback/:id/messages", "staff", async ({ request, env, exec, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const t = await getTicket(env.DB, id);
      if (!t || !canRead(staff, t.submitter_id)) return NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validateMessageInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const triage = can(staff, "feedback.triage");
      if (v.value.internal && !triage) return error(403, "forbidden", "Chỉ quản trị viên được ghi chú nội bộ.");
      const now = new Date();
      const at = now.toISOString();
      const messageId = crypto.randomUUID();
      await env.DB.batch([
        insertReplyStatement(env.DB, { id: messageId, ticketId: id, authorId: staff.id, body: v.value.body, internal: v.value.internal, now: at, windowStart: windowStart(now), limit: MESSAGE_LIMIT_PER_HOUR }),
        touchAfterReplyStatement(env.DB, { ticketId: id, messageId, now: at, internal: v.value.internal, authorId: staff.id }),
        auditStatement(env.DB, { staffId: staff.id, action: "feedback_replied", at, targetType: "feedback", targetId: id, detail: feedbackCode(t.seq) }, `EXISTS (SELECT 1 FROM fbk_message WHERE id = '${messageId}')`),
      ]);
      if (!(await messageExists(env.DB, messageId))) return RATE_LIMITED();
      if (staff.id === t.submitter_id) {
        scheduleMail(env, exec, request, id, {
          type: "user_replied", code: feedbackCode(t.seq), kindName: FEEDBACK_KIND_NAME[t.kind_code as FeedbackKind], title: t.title, submitterName: staff.fullName, excerpt: v.value.body,
        });
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d, 201) : NOT_FOUND();
    }),

    // Admin đổi trạng thái / người xử lý. Trạng thái đi theo bảng luật (canTransition); khoá lạc quan theo trạng thái cũ.
    route("PATCH", "/api/feedback/:id", "admin", async ({ request, env, staff, params }) => {
      const id = params.id!;
      if (!UUID_RE.test(id)) return NOT_FOUND();
      const raw = await readJson(request);
      if (!raw) return BAD_JSON();
      const v = validatePatchInput(raw);
      if (!v.ok) return error(400, "invalid_input", v.message);
      const t = await getTicket(env.DB, id);
      if (!t) return NOT_FOUND();
      const from = t.status_code as FeedbackStatus;
      const to = v.value.status ?? null;
      if (to !== null && !canTransition(from, to)) {
        return error(409, "bad_transition", `Không thể chuyển từ "${FEEDBACK_STATUS_NAME[from]}" sang "${FEEDBACK_STATUS_NAME[to]}".`);
      }
      const at = new Date().toISOString();
      const res = await env.DB.batch([
        patchTicketStatement(env.DB, { id, status: to, assignee: v.value.assignee, resolvedIn: v.value.resolvedIn, now: at, adminId: staff.id, fromStatus: from }),
        auditStatement(
          env.DB,
          { staffId: staff.id, action: to ? "feedback_status_changed" : "feedback_assigned", at, targetType: "feedback", targetId: id, detail: to ? `${feedbackCode(t.seq)}: ${from} → ${to}` : feedbackCode(t.seq) },
          "changes() > 0",
        ),
      ]);
      if ((res[0]?.meta.changes ?? 0) === 0) {
        const now = await getTicket(env.DB, id);
        if (now && now.status_code !== from) return error(409, "stale", "Yêu cầu vừa được người khác đổi trạng thái, hãy tải lại.");
        return error(400, "invalid_input", "Người xử lý không tồn tại hoặc đã ngưng hoạt động.");
      }
      const d = await detail(env.DB, staff, id);
      return d ? json(d) : NOT_FOUND();
    }),
  ],
};
```

- [ ] **Step 4: Đăng ký module**

Trong `src/index.ts`: thêm `import { feedbackModule } from "./modules/feedback";` và thêm `feedbackModule` vào cuối mảng `modules`.

- [ ] **Step 5: Chạy toàn bộ kiểm cơ bản**

Run: `npm run typecheck && npm test`
Expected: 0 lỗi kiểu; toàn bộ test xanh (kể cả `architecture.test.ts`).

- [ ] **Step 6: Chạy e2e**

Run: `npm run test:e2e -- feedback`
Expected: in đủ các dòng `✓ …` và `feedback: OK`. Nếu "trần song song" đếm sai số: kiểm câu `INSERT_TICKET` (đếm và chèn phải cùng một câu) và rằng mọi lời gọi cùng một tài khoản (cùng `submitter_id`).

Nếu `GET /api/feedback/mine` trả 404 not_found: router khớp `:id` trước tuyến tĩnh → đổi thứ tự khai trong `routes` (tuyến tĩnh lên trước); nếu router chọn theo độ đặc thù thì bỏ qua.

- [ ] **Step 7: Chạy toàn bộ e2e (không hồi quy)**

Run: `npm run test:e2e`
Expected: toàn bộ kịch bản xanh, bước cuối `audit-invariants` xanh.

- [ ] **Step 8: Commit**

```bash
git add src/modules/feedback/index.ts src/index.ts tests/e2e/feedback.mjs tests/e2e/run.mjs
git commit -m "Góp ý: route /api/feedback* + đăng ký module + e2e (quyền, chuyển trạng thái, trần song song)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Giao diện — trang `/feedback`, menu, chấm đỏ

**Files:**
- Create: `public/feedback.html`, `web/feedback.ts`
- Modify: `web/shell.ts`, `web/account.ts`, `package.json` (`build:web`), `src/shared/sw-policy.ts` (`PAGES`)

**Interfaces:**
- Consumes: `api`, `ApiError`, `Api` (`web/api.ts`); `h`, `byId`, `replaceChildren` (`web/dom.ts`); `initShell`, `showError` (`web/shell.ts`); `FEEDBACK_*` từ `src/shared/feedback-catalog.ts`; `can` từ `src/shared/permissions.ts`.
- Produces: `feedbackBadge(): Promise<number>` xuất từ `web/shell.ts`.

- [ ] **Step 1: Trang HTML**

```html
<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#0c4a6e"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Tour Đảo"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" type="image/png" href="/icons/icon-192.png"><link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"><link rel="stylesheet" href="/app.css"><title>Góp ý — Tour Đảo Booking</title></head>
<body data-title="Góp ý" data-back="/account">
<header id="topbar"></header>
<main>
  <h1>Góp ý / Báo lỗi</h1>
  <p class="muted">Gửi báo lỗi, đề xuất hoặc câu hỏi cho quản trị viên. Chúng tôi phản hồi ngay tại đây.</p>
  <div id="error" class="alert" role="alert" hidden></div>
  <section id="new-card" class="card" hidden>
    <h2>Gửi yêu cầu mới</h2>
    <form id="new-form" class="grid" autocomplete="off">
      <label>Loại<select id="new-kind"></select></label>
      <label>Tiêu đề<input id="new-title" type="text" maxlength="120" required></label>
      <label>Mô tả<textarea id="new-body" rows="5" maxlength="4000" required></textarea></label>
      <p id="new-context" class="muted"></p>
      <div><button id="new-submit" class="btn btn-primary" type="submit">Gửi</button> <button id="new-cancel" class="btn btn-link" type="button">Huỷ</button></div>
    </form>
  </section>
  <section id="list-card" class="card">
    <div id="tabs"></div>
    <div id="summary"></div>
    <div id="list"></div>
  </section>
  <section id="thread" class="card" hidden></section>
</main>
<script type="module" src="/js/feedback.js"></script>
</body></html>
```

- [ ] **Step 2: `web/feedback.ts`**

```ts
// Trang Góp ý / Báo lỗi: gửi yêu cầu mới, "Yêu cầu của tôi", luồng trả lời; admin có thêm tab "Hàng đợi" (lọc, đổi trạng thái, ghi chú nội bộ).
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
import { FEEDBACK_KINDS, FEEDBACK_KIND_NAME, FEEDBACK_STATUSES, FEEDBACK_STATUS_NAME, FEEDBACK_TRANSITIONS, type FeedbackStatus } from "../src/shared/feedback-catalog";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { initShell, showError } from "./shell";

declare const __BUILD_ID__: string | undefined;

const errorEl = byId("error");
const staff = await initShell();
const isAdmin = staff.permissions.includes("ADMIN");
const params = new URLSearchParams(location.search);

let tab: "mine" | "queue" = "mine";
let statusFilter: FeedbackStatus | "" = "";
let clientRequestId = crypto.randomUUID(); // một lần khi mở form; giữ nguyên khi thử lại (mạng yếu) để máy chủ không tạo trùng

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

/** Thao tác GHI: khoá nút từ lúc bấm đến khi xong (bấm đúp không gửi hai lần), mở lại ở finally. */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

function collectContext(): Api.FeedbackContextDto {
  const from = params.get("from");
  const nav = navigator as Navigator & { standalone?: boolean };
  const ctx: Api.FeedbackContextDto = {
    device: navigator.userAgent.slice(0, 120),
    standalone: window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true,
  };
  if (from && from.startsWith("/")) ctx.path = from.slice(0, 200);
  if (typeof __BUILD_ID__ !== "undefined") ctx.appVersion = __BUILD_ID__;
  return ctx;
}

// ---- Form gửi mới ------------------------------------------------------------------------------------------------
const newCard = byId("new-card");
const kindSel = byId<HTMLSelectElement>("new-kind");
replaceChildren(kindSel, ...FEEDBACK_KINDS.map((k) => h("option", { value: k }, FEEDBACK_KIND_NAME[k])));
function openForm(): void {
  const ctx = collectContext();
  byId("new-context").textContent = `Sẽ đính kèm tự động: ${ctx.path ? `trang ${ctx.path}, ` : ""}thiết bị của bạn${ctx.standalone ? " (app đã cài)" : ""}${ctx.appVersion ? `, phiên bản ${ctx.appVersion}` : ""}.`;
  newCard.hidden = false;
  byId("new-title").focus();
}
byId("new-cancel").addEventListener("click", () => (newCard.hidden = true));
byId<HTMLFormElement>("new-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = byId<HTMLButtonElement>("new-submit");
  const body: Api.FeedbackCreateInput = {
    kind: kindSel.value as Api.FeedbackKind,
    title: byId<HTMLInputElement>("new-title").value,
    body: byId<HTMLTextAreaElement>("new-body").value,
    clientRequestId,
    context: collectContext(),
  };
  const r = await act(() => api<Api.FeedbackDetailResponse>("/api/feedback", { method: "POST", body }), btn);
  if (!r) return; // giữ nguyên clientRequestId: bấm Gửi lại sẽ không tạo trùng
  clientRequestId = crypto.randomUUID();
  byId<HTMLFormElement>("new-form").reset();
  newCard.hidden = true;
  location.assign(`/feedback?id=${r.ticket.id}`);
});

// ---- Danh sách ---------------------------------------------------------------------------------------------------
function ticketRow(t: Api.FeedbackTicketDto): HTMLElement {
  const link = h("a", { href: `/feedback?id=${t.id}` }, h("strong", null, `${t.code} · ${t.title}`));
  return h(
    "div",
    { class: "list-row" },
    link,
    t.unread && h("span", { class: "badge badge-cancelled" }, "Mới"),
    h("div", { class: "muted" }, `${t.kindName} · ${t.statusName} · ${when(t.lastActivityAt)}${tab === "queue" && t.submitterName ? ` · ${t.submitterName}` : ""}`),
    t.mailPending && h("div", { class: "muted" }, "Chưa gửi được email báo admin"),
  );
}

async function loadList(): Promise<void> {
  const tabs = byId("tabs");
  replaceChildren(
    tabs,
    h("button", { type: "button", class: tab === "mine" ? "btn btn-primary" : "btn btn-link", onclick: () => ((tab = "mine"), void loadList()) }, "Yêu cầu của tôi"),
    isAdmin && h("button", { type: "button", class: tab === "queue" ? "btn btn-primary" : "btn btn-link", onclick: () => ((tab = "queue"), void loadList()) }, "Hàng đợi"),
    h("button", { type: "button", class: "btn btn-link", onclick: () => ((newCard.hidden = false), openForm()) }, "+ Gửi yêu cầu mới"),
  );
  showError(errorEl, null);
  const summary = byId("summary");
  try {
    if (tab === "queue") {
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const r = await api<Api.FeedbackQueueResponse>(`/api/feedback${q}`);
      const filter = h("select", { onchange: (e: Event) => ((statusFilter = (e.target as HTMLSelectElement).value as FeedbackStatus | ""), void loadList()) },
        h("option", { value: "" }, "Mọi trạng thái"), ...FEEDBACK_STATUSES.map((s) => h("option", { value: s, selected: s === statusFilter }, FEEDBACK_STATUS_NAME[s])));
      const weeks = [...new Set(r.stats.map((s) => s.week))];
      const count = (w: string, k: string) => r.stats.filter((s) => s.week === w && s.kind === k).reduce((n, s) => n + s.count, 0);
      replaceChildren(
        summary,
        filter,
        weeks.length > 0 &&
          h("table", { class: "items" },
            h("thead", null, h("tr", null, h("th", null, "Tuần"), ...FEEDBACK_KINDS.map((k) => h("th", null, FEEDBACK_KIND_NAME[k])))),
            h("tbody", null, ...weeks.map((w) => h("tr", null, h("td", null, w), ...FEEDBACK_KINDS.map((k) => h("td", null, String(count(w, k)))))))),
      );
      replaceChildren(byId("list"), ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Chưa có yêu cầu nào.")]));
    } else {
      replaceChildren(summary);
      const r = await api<Api.FeedbackListResponse>("/api/feedback/mine");
      replaceChildren(byId("list"), ...(r.tickets.length ? r.tickets.map(ticketRow) : [h("p", { class: "muted" }, "Bạn chưa gửi yêu cầu nào.")]));
    }
  } catch (err) {
    fail(err);
  }
}

// ---- Luồng một yêu cầu -------------------------------------------------------------------------------------------
async function loadThread(id: string): Promise<void> {
  byId("list-card").hidden = true;
  const box = byId("thread");
  box.hidden = false;
  let d: Api.FeedbackDetailResponse;
  try {
    d = await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`);
  } catch (err) {
    fail(err);
    replaceChildren(box, h("a", { href: "/feedback" }, "← Quay lại"));
    return;
  }
  const t = d.ticket;
  const body = h("textarea", { rows: 4, maxLength: 4000, placeholder: "Viết phản hồi…" });
  const internal = h("input", { type: "checkbox" });
  const send = h("button", { type: "button", class: "btn btn-primary" }, "Gửi");
  send.addEventListener("click", async () => {
    const r = await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/messages`, { method: "POST", body: { body: body.value, internal: d.canTriage && internal.checked } }), send);
    if (r) void loadThread(id);
  });
  const controls: HTMLElement[] = [];
  if (d.canTriage) {
    for (const to of FEEDBACK_TRANSITIONS[t.status]) {
      const b = h("button", { type: "button", class: "btn btn-link" }, `→ ${FEEDBACK_STATUS_NAME[to]}`);
      b.addEventListener("click", async () => {
        await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`, { method: "PATCH", body: { status: to } }), b);
        void loadThread(id); // thành công hay 409 (trạng thái đã đổi) đều nạp lại để thấy trạng thái mới; lỗi vẫn hiện ở banner
      });
      controls.push(b);
    }
  }
  replaceChildren(
    box,
    h("a", { href: "/feedback" }, "← Danh sách"),
    h("h2", null, `${t.code} · ${t.title}`),
    h("p", { class: "muted" }, `${t.kindName} · ${t.statusName}${t.resolvedIn ? ` · sửa ở bản ${t.resolvedIn}` : ""} · ${t.submitterName ?? ""} · ${when(t.createdAt)}`),
    t.context.path || t.context.device || t.context.appVersion
      ? h("p", { class: "muted" }, [t.context.path && `Trang: ${t.context.path}`, t.context.orderCode && `Đơn: ${t.context.orderCode}`, t.context.device && `Thiết bị: ${t.context.device}`, t.context.appVersion && `Bản: ${t.context.appVersion}`].filter(Boolean).join(" · "))
      : null,
    ...controls,
    ...d.messages.map((m) =>
      h("div", { class: "card" }, h("div", { class: "muted" }, `${m.authorName ?? "?"} · ${when(m.createdAt)}`, m.internal && h("span", { class: "badge badge-draft" }, "Ghi chú nội bộ")), h("p", null, m.body)),
    ),
    h("label", null, "Trả lời", body),
    d.canTriage && h("label", null, internal, " Ghi chú nội bộ (người gửi không thấy)"),
    send,
  );
}

const id = params.get("id");
if (id) void loadThread(id);
else {
  void loadList();
  if (params.get("new") === "1") openForm();
}
```

- [ ] **Step 3: Menu + chấm đỏ trong `web/shell.ts`**

Thêm export (dưới hàm `logout`):

```ts
/** Số mục chưa đọc của Góp ý (phản hồi mới cho tôi + yêu cầu chờ admin). Lỗi mạng → 0, không làm hỏng khung. */
export async function feedbackBadge(): Promise<number> {
  try {
    const b = await api<Api.FeedbackBadgeResponse>("/api/feedback/badge");
    return b.mine + b.queue;
  } catch {
    return 0;
  }
}
```

Trong `initShell`, sau khối `replaceChildren(nav, …)` (trước `replaceChildren(who, …)`), thêm:

```ts
  const feedbackLink = h("a", { href: `/feedback?new=1&from=${encodeURIComponent(path)}` }, "Góp ý");
  nav.append(feedbackLink);
  void feedbackBadge().then((n) => {
    if (n > 0) feedbackLink.append(" ", h("span", { class: "badge badge-cancelled" }, String(n)));
  });
```

Trong `web/account.ts`, import `feedbackBadge` cùng chỗ với `initShell`, và thêm một dòng vào mảng con của `replaceChildren(byId("links"), …)` ngay TRƯỚC `logoutBtn`:

```ts
  h("a", { class: "row-link", href: "/feedback" }, "Góp ý / Báo lỗi", feedbackBadgeEl, icon("next", 20)),
```

với `feedbackBadgeEl` khai trước khối đó:

```ts
const feedbackBadgeEl = h("span", { class: "badge badge-cancelled", hidden: true });
void feedbackBadge().then((n) => {
  if (n > 0) {
    feedbackBadgeEl.textContent = String(n);
    feedbackBadgeEl.hidden = false;
  }
});
```

- [ ] **Step 4: Build, danh sách trang, mã bản dựng**

Trong `package.json`, script `build:web`: thêm `feedback.ts` vào danh sách entry (sau `web/locations.ts`) và cho bundle trang cùng mã bản dựng như service worker. Thay lệnh esbuild đầu để có `--define`, tính mã một lần:

```
"build:web": "BUILD_ID=$(date +%Y%m%d%H%M%S); esbuild web/login.ts web/orders.ts web/order-form.ts web/order.ts web/audit.ts web/staff.ts web/account.ts web/catalog.ts web/parties.ts web/locations.ts web/feedback.ts --bundle --format=esm --target=es2022 --minify --define:__BUILD_ID__=\\\"$BUILD_ID\\\" --outdir=public/js && esbuild web/sw/sw.ts --bundle --format=iife --target=es2022 --minify --define:__BUILD_ID__=\\\"$BUILD_ID\\\" --outfile=public/sw.js",
```

Trong `src/shared/sw-policy.ts`, thêm `"/feedback"` vào cuối mảng `PAGES`.

- [ ] **Step 5: Kiểm**

Run: `npm run typecheck && npm test && npm run build:web`
Expected: 0 lỗi kiểu (gồm `tsc -p web`); test xanh (test `sw-policy` đối chiếu `PAGES` với `public/*.html`); build ra `public/js/feedback.js`.

- [ ] **Step 6: Thử tay trên trình duyệt (không có kiểm tự động cho `web/`)**

Run: `npm run dev` (hoặc dùng D1 local đã seed như `run.mjs`), đăng nhập một tài khoản thường rồi:
1. Menu "Góp ý" mở `/feedback?new=1&from=/…`: form hiện, dòng "Sẽ đính kèm tự động…" đúng.
2. Gửi một yêu cầu → chuyển sang luồng của yêu cầu; danh sách "Yêu cầu của tôi" có nó; bấm Gửi hai lần liên tiếp chỉ tạo một.
3. Đăng nhập admin (cửa sổ khác): tab "Hàng đợi" thấy yêu cầu kèm "Chưa gửi được email báo admin" (local không có binding), thấy bảng thống kê tuần; các nút chuyển trạng thái chỉ hiện chuyển hợp lệ; ghi chú nội bộ không hiện ở phía người gửi.
4. Trả lời từ admin → người gửi thấy chấm đỏ ở menu/tab Tôi, mở lên thì hết.
5. Trên màn hình iPhone hẹp (DevTools 390px): không cuộn ngang, nút bấm được.
Ghi kết quả (đạt/không) vào `docs/HANDOFF-FEEDBACK.md` ở Task 10; ảnh chụp nếu có đặt ở `docs/evidence/2026-09-21-feedback/`.

- [ ] **Step 7: Commit**

```bash
git add public/feedback.html web/feedback.ts web/shell.ts web/account.ts package.json src/shared/sw-policy.ts
git commit -m "Góp ý: trang /feedback (form, yêu cầu của tôi, luồng, hàng đợi admin), menu + chấm đỏ, mã bản dựng cho bundle trang

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

(Không commit `public/js/*` nếu repo đang bỏ qua thư mục này; kiểm `git status` — nếu `public/js` được theo dõi trong git thì thêm `public/js/feedback.js` và các bundle bị đổi.)

---

### Task 10: Cấu hình email, tài liệu, bàn giao triển khai

**Files:**
- Modify: `wrangler.jsonc`, `docs/ARCHITECTURE.md`
- Create: `docs/HANDOFF-FEEDBACK.md`

- [ ] **Step 1: Khai binding `EMAIL` theo tài liệu hiện hành**

Đọc `https://developers.cloudflare.com/email-service/` (mục gửi từ Workers/binding + yêu cầu tên miền) để lấy ĐÚNG khoá cấu hình binding `EMAIL` (tên mảng/khoá trong wrangler, cách xác minh tên miền gửi, SPF/DKIM). Thêm khối binding vào `wrangler.jsonc` đúng như tài liệu, kèm chú thích tiếng Việt một dòng nêu: binding do Email Service beta cung cấp; thiếu binding hoặc thiếu hai secret thì tính năng email tự tắt, yêu cầu vẫn lưu và hàng đợi báo "chưa gửi được email". Chạy `npm run types` nếu binding mới đổi kiểu `Env`; `mailConfig` đọc qua ép kiểu nên không phụ thuộc kiểu sinh.

Run: `npx wrangler deploy --dry-run` 
Expected: cấu hình hợp lệ, không lỗi về binding.

- [ ] **Step 2: Cập nhật `docs/ARCHITECTURE.md`**

Trong danh sách module (sơ đồ đầu file) thêm `feedback` sau `parties`; trong đoạn "Ranh giới SQL của module nghiêm" thêm `feedback` vào danh sách module nghiêm (`locations`, `parties`, `staff`, `feedback`); trong "Chuẩn dữ liệu" thêm `fbk_` vào ví dụ tiền tố; thêm mục ngắn cuối file:

```
## Góp ý / Báo lỗi (module `feedback`)

Ticket một chiều-thành-hai-chiều: `fbk_ticket` + `fbk_message`. Luật chuyển trạng thái ở `src/shared/feedback-catalog.ts` (dùng chung với `web/`). Chống spam bằng MỘT câu `INSERT … SELECT … WHERE (đếm) < trần` (không có bước đếm-rồi-chèn tách rời). Email báo admin đi qua `notifyAdmins()` trong `waitUntil`, lỗi không làm hỏng yêu cầu (`notified_at` NULL → hàng đợi hiện "chưa gửi được email"). Thiết kế: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md`; triển khai: `docs/HANDOFF-FEEDBACK.md`.
```

- [ ] **Step 3: Viết `docs/HANDOFF-FEEDBACK.md`**

```markdown
# Bàn giao: Góp ý / Báo lỗi

Spec: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md` · Kế hoạch: `docs/superpowers/plans/2026-09-21-gop-y-bao-loi.md`.

## Trạng thái mã
(điền khi thi công xong: commit, số test, e2e, kết quả thử tay ở Task 9 bước 6)

## Việc của chủ dự án TRƯỚC khi triển khai
1. Bật Cloudflare Email Service trên tài khoản (beta, gói Workers Paid — đã trả phí).
2. Xác minh tên miền gửi thư (vd `tourdao.vn`): SPF/DKIM theo hướng dẫn của Cloudflare.
3. Đặt hai secret: `npx wrangler secret put FEEDBACK_NOTIFY_EMAIL` (địa chỉ admin nhận) và `npx wrangler secret put FEEDBACK_MAIL_FROM` (địa chỉ gửi trên tên miền đã xác minh). Thiếu một trong hai/binding thì email tự tắt (yêu cầu vẫn lưu).

## Triển khai (làm khi được lệnh; ĐỘC LẬP với B5)
1. `npm test`, `npm run typecheck`, `npm run test:e2e` đều xanh (chạy riêng từng lệnh, ghi kết quả).
2. Ghi điểm khôi phục: `npx wrangler d1 time-travel info tourdao-sales-db`.
3. `npm run db:migrate:remote` — chỉ THÊM bảng `fbk_*` (mã cũ chạy nguyên vẹn nên áp migration TRƯỚC deploy là an toàn). Kiểm số migration chưa áp có ĐÚNG là `0016_feedback.sql` (không kéo theo file B5 nào).
4. `npx wrangler deploy`.
5. Kiểm sau deploy: gửi một yêu cầu thật bằng tài khoản thường; kiểm email đến hộp thư admin và hàng đợi không báo "chưa gửi được email"; nếu email không đến: xem log Worker (`console.error "Gửi email báo admin thất bại"`), sửa cấu hình rồi thử lại — yêu cầu không mất.
6. Chạy `node scripts/audit-invariants.mjs --remote` (chỉ đọc).

## Hoàn tác
Bảng `fbk_*` mới, không ai khác đọc: gỡ bản triển khai bằng `wrangler rollback` là đủ; KHÔNG cần xoá bảng (mã cũ không đụng tới).

## Điểm mở
- Thời hạn lưu giữ yêu cầu đã đóng (dữ liệu có thể chứa thông tin khách do người dùng gõ).
- `admin_seen_at` dùng chung mọi admin (một admin xem là các admin khác hết chấm đỏ).
- Việc sau v1: ảnh (R2), email cho người gửi, retry gửi thư bằng Cron, `duplicate_of`, ưu tiên/SLA, `tenant_id`.
```

- [ ] **Step 4: Kiểm toàn bộ một lượt cuối**

Run (từng lệnh riêng, ghi kết quả): `npm test` ; `npm run typecheck` ; `npm run test:e2e`
Expected: test xanh; 0 lỗi kiểu; e2e toàn bộ xanh gồm `feedback` và bước `audit-invariants`.

- [ ] **Step 5: Commit và đẩy**

```bash
git add wrangler.jsonc docs/ARCHITECTURE.md docs/HANDOFF-FEEDBACK.md
git commit -m "Góp ý: binding email, tài liệu kiến trúc và bàn giao triển khai

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin HEAD
```

Không gộp vào `main`, không triển khai production khi chưa có lệnh của chủ dự án.

---

## Tự rà kế hoạch với spec

| Yêu cầu spec | Task |
|---|---|
| Dữ liệu `fbk_*`, idempotency `client_request_id`, `resolved_in`, seen/last_* | 4, 6 |
| Luật chuyển trạng thái + PATCH không đặt tuỳ ý + mở lại khi người gửi trả lời | 2, 6 (SQL `TOUCH_AFTER_REPLY`), 8 |
| Chống spam đúng cho cả tạo và trả lời, song song | 6 (INSERT có điều kiện), 8 (e2e song song) |
| `scopeWhere` một chỗ | 6 (mọi truy vấn theo phạm vi ở `repository.ts`: `LIST_MINE` theo `submitter_id`, `LIST_QUEUE` chỉ admin gọi), 8 (`canRead` dùng `can()` một nơi) |
| Quyền `feedback.*` + test khoá bản đồ | 5 |
| Nhật ký dùng chung, không migration | 5, 8 |
| `context` không đáng tin, `appVersion` là mã build thật | 3, 9 (`--define:__BUILD_ID__`) |
| Email `notifyAdmins`, `waitUntil`, `notified_at`, hàng đợi báo "chưa gửi được mail" | 7, 8, 9 |
| Hàng đợi có lọc + thống kê kind × status × tuần | 6, 8, 9 |
| Số migration độc lập B5 | Global Constraints, 4, 10 |
| Sổ dữ liệu + bài kiểm kiến trúc (tiền tố, STRICT, cạnh) | 3, 4, 6 |
| Thời hạn lưu giữ, tenant, `duplicate_of` | ghi ở spec + `HANDOFF-FEEDBACK.md` (không làm ở v1) |
| Kiểm thử: luật thuần, e2e quyền/trần/idempotency, kiến trúc | 2, 3, 7, 8 |

Điểm lệch có chủ ý so với chữ của spec đã liệt kê ở đầu kế hoạch và ghi vào spec ở Task 1.
