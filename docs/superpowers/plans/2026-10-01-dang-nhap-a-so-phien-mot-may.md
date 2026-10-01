# Phần A — Sổ phiên đăng nhập, mỗi tài khoản một máy (ADR-0075) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Máy chủ giữ sổ phiên (`aut_session`): biết tài khoản đăng nhập trên máy nào, phiên còn hiệu lực không; tài khoản thường chỉ một máy (máy mới vào → máy cũ bị đăng xuất); IT/Toàn quyền xem và gỡ phiên; mỗi người xem lịch sử của mình.

**Architecture:** Token cookie đổi từ `staffId.iat.sig` sang `staffId.iat.sessionId.sig`; mỗi request kiểm chữ ký → dòng `aut_session` chưa kết thúc/chưa hết hạn → tài khoản còn hoạt động (`credentials_changed_at` giữ làm lưới). Cấp phiên mới = một `db.batch` (kết thúc phiên hết hạn → kết thúc phiên còn sống nếu chịu luật một máy → chèn phiên mới); CSDL chặn thêm bằng chỉ mục duy nhất có điều kiện. Máy bị đăng xuất: đóng kết nối Bảng tin gắn nhãn `phien:<id>`, tắt địa chỉ thông báo màn hình khoá của tài khoản trừ máy mới.

**Tech Stack:** TypeScript, Cloudflare Workers + D1 (SQLite), Durable Object Bảng tin, `node --test`, e2e `tests/e2e`, giao diện thuần dựng bằng `h()`.

**Spec:** `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (§5b, §6, §11 mục 15–20, §13) + `docs/adr/ADR-0075-phien-dang-nhap-mot-may.md`. Đọc cả hai trước khi làm.

## Global Constraints

- Mọi chữ hiện cho người dùng, câu lỗi, tài liệu, commit: **tiếng Việt có dấu**; không lộ mã thô (`replaced`, `session_ended`…) ra giao diện.
- Không dependency runtime mới. Không `innerHTML` (dựng bằng `h()`); giá trị CSS đi vào token; ô gõ 16px (`web/CLAUDE.md`).
- Mọi SQL qua `defineSql(module, tên, sql)` (`src/shared/sql-registry.ts`), cột liệt kê tường minh; chỉ module `auth` ghi `aut_session`; module `thongbao` ghi `ntf_push_sub`.
- Dấu thời gian ISO UTC (`new Date().toISOString()`); MỘT mốc giờ mỗi request.
- Không xoá cứng dòng `aut_session` (kết thúc = đặt `ended_at`, `end_reason`).
- Migration: chỉ thêm tệp mới; số = số lớn nhất trong `migrations/` của nhánh **sau khi gộp main** + 1 (hôm nay `0058`); bài kiểm tìm tệp theo **đuôi tên** `_aut_session.sql`.
- Nhật ký (`audit_log`, `console.*`) **không** ghi IP, User-Agent, SĐT, token.
- Ô quyền mới có đủ **10 cột** theo thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR`.
- **Không nới luật cho môi trường thử** (e2e, khung thử): không cờ tắt luật một máy.
- Không `git push`, không merge vào `main`, không deploy (CLAUDE.md §8). Commit nhỏ, thông điệp tiếng Việt, đuôi `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Phiên hết hạn chưa kết thúc chặn lần đăng nhập sau** (dòng `ended_at IS NULL` nhưng `expires_at` đã qua vẫn nằm trong chỉ mục duy nhất) → lần đăng nhập kế tiếp phải thành công. Bài: Task 3 bước "phiên hết hạn".
2. **Phiên đã chết theo `credentials_changed_at` vẫn hiện "Đang hiệu lực" ở màn IT** → mọi đường đổi PIN/ngưng/gỡ Face ID kết thúc dòng phiên trong cùng lô; DTO tính trạng thái cả theo lưới. Bài: Task 5 + Task 7.
3. **Máy bị đá vẫn nhận thông báo màn hình khoá** (đăng ký cũ có `session_id` NULL từ trước phát hành) → đăng nhập tài khoản một máy tắt mọi đăng ký của tài khoản trừ đăng ký mang đúng phiên mới. Bài: Task 6.
4. **Hai lần đăng nhập đồng thời cùng tài khoản thường** → đúng một phiên sống, lần thua nhận lỗi sạch (không 500). Bài: Task 3 (thuần, SQLite thật) + Task 9 (e2e chạy đua).
5. **Đăng xuất (route công khai) không kết thúc dòng phiên** → dòng phải có `end_reason = 'dang_xuat'`. Bài: Task 4.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `migrations/0058_aut_session.sql` (tạo) | Bảng `aut_session` + chỉ mục; cột `ntf_push_sub.session_id` |
| `src/migrations-aut-session.test.ts` (tạo) | Kiểm migration trên SQLite thật |
| `src/modules/auth/session.ts` (sửa) | Định dạng token mới có `sessionId` |
| `src/modules/auth/session-ledger.ts` (tạo) | Luật thuần: lý do kết thúc, nhãn máy, trạng thái hiển thị, miễn một máy |
| `src/modules/auth/session-ledger.test.ts` (tạo) | Test thuần |
| `src/modules/auth/repository.ts` (sửa) | SQL `aut_session` |
| `src/modules/auth/session-repo.test.ts` (tạo) | Test lô SQL trên SQLite thật (chạy đua, hết hạn) |
| `src/modules/auth/index.ts` (sửa) | `currentStaff` trả `{ staff, sessionId }`; `issueLoginSession`; `endSessionsStatement`; route đăng xuất, phiên của tôi, phiên mọi người, gỡ phiên |
| `src/shared/router.ts`, `src/shared/router.test.ts`, `src/index.ts`, `tests/audit/harness.mjs` (sửa) | Chữ ký `currentStaff` mới; `ctx.sessionId` |
| `src/modules/accounts/index.ts` (sửa) | 7 chỗ đổi mốc đăng nhập kết thúc phiên trong cùng lô; đổi quyền/vai mất miễn |
| `src/modules/thongbao/repository.ts`, `index.ts` (sửa) | Đăng ký ghi `session_id`; tắt "trừ phiên" |
| `src/modules/bangtin/index.ts`, `tram.ts`, `src/shared/bang-tin.ts` (sửa) | Nhãn `phien:<id>`; `dongCua({ sessionIds })` |
| `src/shared/permissions.ts`, `permissions.test.ts` (sửa) | Ô `auth.session.viewAll`, `auth.session.revoke` |
| `src/shared/audit-actions.ts` (sửa) | `session_revoked` (im lặng) |
| `src/shared/contracts.ts` (sửa) | DTO phiên |
| `web/login.ts`, `web/account.ts`, `web/sessions.ts` (tạo), `public/sessions.html` (tạo), `web/shell.ts`, `src/shared/sw-policy.ts`, `package.json` (sửa) | Lời báo bị đá; lịch sử của tôi; màn Phiên đăng nhập; đăng ký lại thông báo sau đăng nhập |
| `tests/e2e/lib.mjs`, `tests/e2e/phien.mjs` (tạo), các kịch bản e2e hỏng | `session()` nhớ cookie; kịch bản phiên |
| `scripts/audit-invariants.mjs` (sửa) | Bất biến "≤ 1 phiên sống mỗi tài khoản một máy" |
| `docs/data-dictionary.json`, `docs/quyen-hoan.json`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, Trợ giúp | Tài liệu |

---

### Task 0: Đồng bộ nhánh và chụp hiện trạng

**Files:** không sửa mã.

- [ ] **Step 1:** Gộp `main` mới nhất vào nhánh thi công (`git merge main`, lệnh riêng). Ghi số migration lớn nhất: `ls migrations | tail -1` → số của Phần A = số đó + 1. Kiểm nhánh chưa gộp: `git branch --no-merged main` rồi với từng nhánh `git ls-tree --name-only <nhánh> migrations/ | tail -1`. Ghi kết quả vào sổ `docs/superpowers/plans/2026-10-01-dang-nhap-thi-cong-nhat-ky.md` (tạo).
- [ ] **Step 2:** Chụp lại các nơi sẽ đụng (main đã đổi hai lần trong ngày 1/10): `grep -n "newSessionCookie\|setPinStatement\|touchCredentialsStatement\|currentStaff" -r src tests/audit` và dán vào sổ. Nếu số dòng/nơi khác bảng dưới, cập nhật Task 5 trước khi làm.

  Hiện trạng đọc ở `main@4fb2c320`: cấp phiên mới `auth/index.ts` (PIN `:136`, Face ID `:176`); cấp lại `accounts/index.ts` `:192` (đổi PIN), `:275` (gỡ mọi Face ID), `:291` (gỡ một Face ID), `:328` (đặt PIN bằng Face ID); đổi mốc đăng nhập không cấp lại: `:171` (ngưng tài khoản), `:598` (Quản trị đặt lại PIN), `:621` (Quản trị gỡ mọi Face ID).
- [ ] **Step 3:** `npm test` và `npm run typecheck` xanh trước khi đụng gì; ghi số test vào sổ.

---

### Task 1: Migration `aut_session` + `ntf_push_sub.session_id`

**Files:**
- Create: `migrations/0058_aut_session.sql`
- Create: `src/migrations-aut-session.test.ts`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`)

**Interfaces:**
- Produces: bảng `aut_session(id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by)`; chỉ mục `aut_session_one_live`; cột `ntf_push_sub.session_id TEXT NULL`.

- [ ] **Step 1: Viết test đỏ** — `src/migrations-aut-session.test.ts`:

```ts
// Kiểm migration *_aut_session.sql (ADR-0075 điều 1–4): sổ phiên đăng nhập + liên kết máy nhận thông báo với phiên. Tệp tìm theo ĐUÔI tên.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_aut_session.sql"));
const sqlOf = (f: string) => readFileSync(new URL(f, DIR), "utf8");
const all = () => {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
};
const NOW = "2026-10-02T01:00:00.000Z";
const LATER = "2026-10-09T01:00:00.000Z";
function staffId(db: DatabaseSync): string {
  const r = db.prepare("SELECT id FROM staff LIMIT 1").get() as { id: string } | undefined;
  if (r) return r.id;
  db.exec("INSERT INTO staff (id, phone, pin_hash, active) VALUES ('s1', '0900000001', 'x', 1)");
  return "s1";
}
const ins = (db: DatabaseSync, id: string, sid: string, single: number, ended: string | null = null, reason: string | null = null) =>
  db.prepare(
    "INSERT INTO aut_session (id, staff_id, method, single, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason) " +
      "VALUES (?, ?, 'PIN', ?, 'iPhone · Safari', 'ua', '1.2.3.4', ?, ?, ?, ?, ?)",
  ).run(id, sid, single, NOW, NOW, LATER, ended, reason);

test("(a) đúng một tệp *_aut_session.sql, không phải migration siết B5", () => {
  assert.equal(MATCHES.length, 1, JSON.stringify(MATCHES));
  assert.doesNotMatch(MATCHES[0]!, /staff_party_required/);
});

test("(b) tài khoản một máy: hai phiên sống cùng lúc bị CSDL chặn; phiên đã kết thúc không tính", () => {
  const db = all();
  const s = staffId(db);
  ins(db, "p1", s, 1);
  assert.throws(() => ins(db, "p2", s, 1), /UNIQUE/);
  db.prepare("UPDATE aut_session SET ended_at = ?, end_reason = 'bi_thay' WHERE id = 'p1'").run(NOW);
  ins(db, "p2", s, 1);
});

test("(c) tài khoản được miễn (single = 0) mở nhiều phiên được", () => {
  const db = all();
  const s = staffId(db);
  ins(db, "p1", s, 0);
  ins(db, "p2", s, 0);
});

test("(d) end_reason chỉ nhận danh sách cố định; ended_at và end_reason đi cặp", () => {
  const db = all();
  const s = staffId(db);
  assert.throws(() => ins(db, "p1", s, 1, NOW, "replaced"), /CHECK/);
  assert.throws(() => ins(db, "p2", s, 1, NOW, null), /CHECK/);
  assert.throws(() => ins(db, "p3", s, 1, null, "dang_xuat"), /CHECK/);
  for (const [i, r] of ["dang_xuat", "bi_thay", "bi_go", "doi_pin", "dat_lai_pin", "tat_hai_lop", "ngung", "het_han", "mat_mien", "doi_face_id"].entries()) {
    ins(db, `ok${i}`, s, 1, NOW, r);
  }
});

test("(e) ntf_push_sub có cột session_id, mặc định NULL cho dòng cũ", () => {
  const db = all();
  const cols = (db.prepare("PRAGMA table_info(ntf_push_sub)").all() as { name: string; dflt_value: unknown }[]).map((c) => c.name);
  assert.ok(cols.includes("session_id"));
});
```

  Nếu `staff` có thêm cột NOT NULL ở main (kiểm `PRAGMA table_info(staff)`), sửa câu chèn trong `staffId()` cho đủ cột.

- [ ] **Step 2:** `node --test src/migrations-aut-session.test.ts` → FAIL (chưa có tệp).
- [ ] **Step 3: Viết migration** `migrations/0058_aut_session.sql`:

```sql
-- Migration 0058 — ADR-0075 (accepted 2026-10-01): SỔ PHIÊN ĐĂNG NHẬP. Mỗi lần cấp phiên mới (PIN hoặc Face ID) là một dòng; không xoá dòng (lịch sử).
-- Kết thúc = đặt ended_at + end_reason (cặp đi cùng nhau). single = 1: tài khoản chịu luật một máy — CSDL chặn hai phiên sống cùng lúc bằng chỉ mục
-- duy nhất có điều kiện (máy chủ cũng kết thúc phiên cũ trong cùng lô; chỉ mục là lưới khi hai lần đăng nhập chạy đua).
-- ip, user_agent là dữ liệu cá nhân: chỉ IT/Toàn quyền và chính chủ tài khoản xem; KHÔNG ghi vào nhật ký.
CREATE TABLE aut_session (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  method TEXT NOT NULL CHECK (method IN ('PIN', 'PIN_MFA', 'PIN_TRUSTED', 'PASSKEY')),
  single INTEGER NOT NULL CHECK (single IN (0, 1)),
  trusted_device_id TEXT,
  device_label TEXT NOT NULL CHECK (length(device_label) BETWEEN 1 AND 80),
  user_agent TEXT CHECK (user_agent IS NULL OR length(user_agent) <= 200),
  ip TEXT CHECK (ip IS NULL OR length(ip) <= 64),
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  ended_at TEXT,
  end_reason TEXT CHECK (end_reason IS NULL OR end_reason IN
    ('dang_xuat', 'bi_thay', 'bi_go', 'doi_pin', 'dat_lai_pin', 'tat_hai_lop', 'ngung', 'het_han', 'mat_mien', 'doi_face_id')),
  ended_by TEXT REFERENCES staff(id),
  CHECK ((ended_at IS NULL) = (end_reason IS NULL))
);
CREATE UNIQUE INDEX aut_session_one_live ON aut_session (staff_id) WHERE ended_at IS NULL AND single = 1;
CREATE INDEX aut_session_staff_created ON aut_session (staff_id, created_at);
CREATE INDEX aut_session_live ON aut_session (ended_at, created_at);
-- Module thongbao: máy nhận thông báo màn hình khoá gắn với phiên đã đăng ký nó (ADR-0075 điều 6b). Dòng cũ = NULL (trước phát hành).
ALTER TABLE ntf_push_sub ADD COLUMN session_id TEXT;
```

  (Lý do có `doi_face_id`: gỡ Face ID của chính mình/Quản trị gỡ hôm nay "touch" `credentials_changed_at` — ADR-0075 điều 4 liệt kê "đổi PIN"; gỡ Face ID là cùng loại thao tác bảo mật, cần mã riêng để màn IT hiện đúng. Ghi vào sổ thi công như một ruling bề mặt.)

- [ ] **Step 4:** Chạy lại test → PASS. `npm test` → các bài migration cũ vẫn xanh.
- [ ] **Step 5:** Thêm bảng + cột vào `docs/data-dictionary.json` (theo khuôn các bảng `aut_passkey`), ghi rõ `ip`, `user_agent` là **dữ liệu cá nhân, giữ vô hạn, chỉ IT/Toàn quyền và chính chủ xem**; `npm run dict`.
- [ ] **Step 6: Commit** `git add migrations src/migrations-aut-session.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md && git commit -m "Migration sổ phiên đăng nhập aut_session (ADR-0075)"` (thân nói vì sao).

---

### Task 2: Luật thuần của sổ phiên + token mới

**Files:**
- Create: `src/modules/auth/session-ledger.ts`, `src/modules/auth/session-ledger.test.ts`
- Modify: `src/modules/auth/session.ts`, test hiện có của session (nếu có `session.test.ts`; nếu không, thêm vào `session-ledger.test.ts`)

**Interfaces:**
- Produces:
  - `type EndReason = "dang_xuat" | "bi_thay" | "bi_go" | "doi_pin" | "dat_lai_pin" | "tat_hai_lop" | "ngung" | "het_han" | "mat_mien" | "doi_face_id"`
  - `END_REASON_LABEL: Record<EndReason, string>`
  - `isSingleDevice(permissions: readonly PermissionCode[], roles: readonly RoleCode[]): boolean`
  - `sessionDeviceLabel(userAgent: string | null): string`
  - `trimUserAgent(ua: string | null): string | null`
  - `sessionStatus(row: { ended_at: string | null; end_reason: EndReason | null; expires_at: string; created_at: string }, credentialsChangedAtMs: number | null, nowIso: string): { live: boolean; label: string }`
  - `createSessionToken(secret, staffId, sessionId, now?)`, `verifySessionToken(secret, token, now?) → { staffId, sessionId, issuedAt } | null`
  - `SESSION_TOUCH_MS = 5 * 60 * 1000`

- [ ] **Step 1: Test đỏ** — `src/modules/auth/session-ledger.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { END_REASON_LABEL, isSingleDevice, sessionDeviceLabel, sessionStatus, trimUserAgent } from "./session-ledger.ts";
import { createSessionToken, verifySessionToken } from "./session.ts";

const S = "x".repeat(40);

test("token mới mang mã phiên; token kiểu cũ (3 phần) bị từ chối", async () => {
  const t = await createSessionToken(S, "staff-1", "phien-1", 1_000);
  assert.deepEqual(await verifySessionToken(S, t, 2_000), { staffId: "staff-1", sessionId: "phien-1", issuedAt: 1_000 });
  const [a, b, , d] = t.split(".");
  assert.equal(await verifySessionToken(S, `${a}.${b}.${d}`, 2_000), null);
  assert.equal(await verifySessionToken(S, t.replace("phien-1", "phien-2"), 2_000), null, "đổi mã phiên làm hỏng chữ ký");
});

test("miễn một máy: giữ SUPER_ADMIN hoặc vai IT", () => {
  assert.equal(isSingleDevice(["SUPER_ADMIN"], []), false);
  assert.equal(isSingleDevice(["ADMIN"], ["IT"]), false);
  assert.equal(isSingleDevice(["ADMIN"], ["DIRECTOR"]), true);
  assert.equal(isSingleDevice(["PARTNER"], []), true);
  assert.equal(isSingleDevice(["HR"], ["HR_STAFF"]), true);
});

test("tên máy: loại máy + trình duyệt / ứng dụng đã cài, không SĐT", () => {
  const iosApp = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
  const iosSafari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
  const winChrome = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
  assert.equal(sessionDeviceLabel(iosApp), "iPhone · Ứng dụng đã cài");
  assert.equal(sessionDeviceLabel(iosSafari), "iPhone · Safari");
  assert.equal(sessionDeviceLabel(winChrome), "Máy Windows · Chrome");
  assert.equal(sessionDeviceLabel(null), "Thiết bị khác");
});

test("User-Agent cắt còn 200 ký tự", () => {
  assert.equal(trimUserAgent("a".repeat(500))!.length, 200);
  assert.equal(trimUserAgent(null), null);
});

test("trạng thái hiển thị: kết thúc theo dòng, theo hạn, theo lưới credentials_changed_at", () => {
  const base = { ended_at: null, end_reason: null, expires_at: "2026-10-09T00:00:00.000Z", created_at: "2026-10-02T00:00:00.000Z" } as const;
  assert.deepEqual(sessionStatus(base, null, "2026-10-03T00:00:00.000Z"), { live: true, label: "Đang hiệu lực" });
  assert.deepEqual(sessionStatus(base, null, "2026-10-10T00:00:00.000Z"), { live: false, label: END_REASON_LABEL.het_han });
  assert.deepEqual(sessionStatus(base, Date.parse("2026-10-02T05:00:00.000Z"), "2026-10-03T00:00:00.000Z"), { live: false, label: "Đã đổi thông tin đăng nhập" });
  assert.deepEqual(sessionStatus({ ...base, ended_at: "2026-10-02T01:00:00.000Z", end_reason: "bi_thay" }, null, "2026-10-03T00:00:00.000Z"), { live: false, label: "Bị thay bởi máy khác" });
});
```

- [ ] **Step 2:** `node --test src/modules/auth/session-ledger.test.ts` → FAIL.
- [ ] **Step 3: Viết** `src/modules/auth/session.ts` (đổi hai hàm, giữ phần còn lại):

```ts
/** Token = `staffId.<phát hành, mili-giây>.<mã phiên>.<chữ ký>` (ADR-0075 điều 1). Token kiểu cũ 3 phần bị từ chối → đăng nhập lại một lần. */
export async function createSessionToken(secret: string, staffId: string, sessionId: string, now = Date.now()): Promise<string> {
  const payload = `${staffId}.${now}.${sessionId}`;
  return `${payload}.${toBase64Url(await hmac(secret, payload))}`;
}

export async function verifySessionToken(
  secret: string,
  token: string,
  now = Date.now(),
): Promise<{ staffId: string; sessionId: string; issuedAt: number } | null> {
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [staffId, iat, sessionId, sig] = parts as [string, string, string, string];
  let given: Uint8Array;
  try {
    given = fromBase64Url(sig);
  } catch {
    return null;
  }
  if (!timingSafeEqual(await hmac(secret, `${staffId}.${iat}.${sessionId}`), given)) return null;
  const issuedAt = Number(iat);
  if (!Number.isFinite(issuedAt) || issuedAt > now + 60_000) return null;
  return now < issuedAt + SESSION_TTL_SECONDS * 1000 ? { staffId, sessionId, issuedAt } : null;
}
```

  Mã phiên do máy chủ sinh bằng `crypto.randomUUID()` (không chứa dấu chấm).

  `src/modules/auth/session-ledger.ts`:

```ts
// Luật THUẦN của sổ phiên (ADR-0075): lý do kết thúc, miễn luật một máy, tên máy, trạng thái hiển thị. Không đọc CSDL.
import type { PermissionCode } from "../../shared/permissions.ts";
import type { RoleCode } from "../../shared/roles.ts";

export type EndReason = "dang_xuat" | "bi_thay" | "bi_go" | "doi_pin" | "dat_lai_pin" | "tat_hai_lop" | "ngung" | "het_han" | "mat_mien" | "doi_face_id";
export const END_REASON_LABEL: Record<EndReason, string> = {
  dang_xuat: "Đã đăng xuất",
  bi_thay: "Bị thay bởi máy khác",
  bi_go: "Bị IT/Toàn quyền gỡ",
  doi_pin: "Đã đổi PIN",
  dat_lai_pin: "Bị đặt lại PIN",
  tat_hai_lop: "Bị tắt bảo mật hai lớp",
  ngung: "Tài khoản ngưng",
  het_han: "Hết hạn",
  mat_mien: "Không còn quyền dùng nhiều máy",
  doi_face_id: "Đã gỡ Face ID",
};
export const SESSION_TOUCH_MS = 5 * 60 * 1000;

/** ADR-0075 điều 3: miễn luật một máy = giữ quyền SUPER_ADMIN hoặc vai IT còn hiệu lực. */
export const isSingleDevice = (permissions: readonly PermissionCode[], roles: readonly RoleCode[]): boolean =>
  !(permissions.includes("SUPER_ADMIN") || roles.includes("IT"));

export function sessionDeviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  const kind = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android"
    : /Macintosh|Mac OS X/.test(ua) ? "Máy Mac" : /Windows/.test(ua) ? "Máy Windows" : null;
  if (!kind) return "Thiết bị khác";
  const browser = /EdgA?\//.test(ua) ? "Edge" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /FxiOS|Firefox\//.test(ua) ? "Firefox"
    : /Version\/[\d.]+.*Safari/.test(ua) ? "Safari" : /(iPhone|iPad)/.test(ua) ? "Ứng dụng đã cài" : "Trình duyệt";
  return `${kind} · ${browser}`;
}

export const trimUserAgent = (ua: string | null): string | null => (ua === null ? null : ua.slice(0, 200));

export function sessionStatus(
  row: { ended_at: string | null; end_reason: EndReason | null; expires_at: string; created_at: string },
  credentialsChangedAtMs: number | null,
  nowIso: string,
): { live: boolean; label: string } {
  if (row.ended_at !== null && row.end_reason !== null) return { live: false, label: END_REASON_LABEL[row.end_reason] };
  if (row.expires_at <= nowIso) return { live: false, label: END_REASON_LABEL.het_han };
  if (credentialsChangedAtMs !== null && credentialsChangedAtMs > Date.parse(row.created_at)) return { live: false, label: "Đã đổi thông tin đăng nhập" };
  return { live: true, label: "Đang hiệu lực" };
}
```

  Kiểm `RoleCode` có xuất từ `src/shared/roles.ts` (nếu tên khác, dùng đúng tên ở đó). Ứng dụng đã cài trên iPhone (chế độ standalone) không có `Version/… Safari` trong User-Agent — vì vậy nhánh "Ứng dụng đã cài".

- [ ] **Step 4:** Test → PASS. Sửa mọi chỗ gọi `createSessionToken`/`verifySessionToken` cho typecheck (sẽ làm thật ở Task 3; tạm thời `npm run typecheck` sẽ đỏ ở `auth/index.ts` — chấp nhận đến hết Task 3, KHÔNG commit giữa chừng nếu typecheck đỏ: gộp commit Task 2 + Task 3).

---

### Task 3: SQL sổ phiên + cấp phiên + kiểm phiên mỗi request

**Files:**
- Modify: `src/modules/auth/repository.ts`, `src/modules/auth/index.ts`, `src/shared/router.ts`, `src/shared/router.test.ts`, `src/index.ts`, `tests/audit/harness.mjs`
- Create: `src/modules/auth/session-repo.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces (xuất từ `src/modules/auth/index.ts`):
  - `currentStaff(request, env): Promise<{ staff: StaffProfile; sessionId: string } | null>`
  - `issueLoginSession(request, env, profile: StaffProfile, method: "PIN" | "PIN_MFA" | "PIN_TRUSTED" | "PASSKEY", opts?: { trustedDeviceId?: string | null; now?: number }): Promise<{ cookie: string; sessionId: string; endedSessionIds: string[] }>`
  - `reissueSessionCookie(request, env, staffId: string, sessionId: string, issuedAt: number): Promise<string>` (thay `newSessionCookie` ở 4 nơi cấp lại — giữ mã phiên)
  - `endOtherSessionsStatement(db, staffId: string, keepSessionId: string | null, reason: EndReason, at: string, by: string | null): D1PreparedStatement`
  - `endAllSessionsStatement(db, staffId, reason, at, by)` = `endOtherSessionsStatement(db, staffId, null, …)`
  - `liveSessionIdsOf(db, staffId): Promise<string[]>`
  - Router: `AppOptions.currentStaff` trả `{ staff, sessionId } | null`; `ctx.sessionId: string | null`.

- [ ] **Step 1: SQL** — thêm vào `src/modules/auth/repository.ts`:

```ts
export interface SessionRow {
  id: string; staff_id: string; method: string; single: number; trusted_device_id: string | null; device_label: string;
  user_agent: string | null; ip: string | null; created_at: string; last_seen_at: string; expires_at: string;
  ended_at: string | null; end_reason: string | null; ended_by: string | null;
}
const SS_COLS = "id, staff_id, method, single, trusted_device_id, device_label, user_agent, ip, created_at, last_seen_at, expires_at, ended_at, end_reason, ended_by";
// (1) dọn phiên đã quá hạn mà chưa kết thúc — PHẢI đứng trước (2)/(3): dòng hết hạn chưa kết thúc vẫn nằm trong chỉ mục duy nhất aut_session_one_live.
const SS_END_EXPIRED = defineSql("auth", "session_end_expired",
  "UPDATE aut_session SET ended_at = ?2, end_reason = 'het_han' WHERE staff_id = ?1 AND ended_at IS NULL AND expires_at <= ?2");
// (2) kết thúc mọi phiên còn sống của tài khoản (trừ ?3 nếu có) — dùng cho "bị thay", đổi PIN, gỡ, ngưng…
const SS_END_OTHERS = defineSql("auth", "session_end_others",
  "UPDATE aut_session SET ended_at = ?4, end_reason = ?3, ended_by = ?5 WHERE staff_id = ?1 AND ended_at IS NULL AND (?2 IS NULL OR id <> ?2)");
const SS_END_ONE = defineSql("auth", "session_end_one",
  "UPDATE aut_session SET ended_at = ?3, end_reason = ?2, ended_by = ?4 WHERE id = ?1 AND ended_at IS NULL");
const SS_INSERT = defineSql("auth", "session_insert",
  `INSERT INTO aut_session (${SS_COLS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9, ?10, NULL, NULL, NULL)`);
const SS_FIND_LIVE = defineSql("auth", "session_find_live",
  `SELECT ${SS_COLS} FROM aut_session WHERE id = ?1 AND staff_id = ?2 AND ended_at IS NULL AND expires_at > ?3`);
const SS_TOUCH = defineSql("auth", "session_touch",
  "UPDATE aut_session SET last_seen_at = ?2 WHERE id = ?1 AND ended_at IS NULL AND last_seen_at < ?3");
const SS_LIVE_IDS = defineSql("auth", "session_live_ids",
  "SELECT id FROM aut_session WHERE staff_id = ?1 AND ended_at IS NULL");
const SS_LIST_MINE = defineSql("auth", "session_list_mine",
  `SELECT ${SS_COLS} FROM aut_session WHERE staff_id = ?1 ORDER BY created_at DESC LIMIT 30`);
const SS_LIST_ALL = defineSql("auth", "session_list_all",
  `SELECT ${SS_COLS} FROM aut_session WHERE (?1 IS NULL OR staff_id = ?1) AND (?2 = 0 OR (ended_at IS NULL AND expires_at > ?3)) ORDER BY created_at DESC LIMIT 200`);
const SS_GET = defineSql("auth", "session_get", `SELECT ${SS_COLS} FROM aut_session WHERE id = ?1`);

export const endExpiredSessionsStatement = (db: D1Database, staffId: string, at: string) => db.prepare(SS_END_EXPIRED).bind(staffId, at);
export const endOtherSessionsStatement = (db: D1Database, staffId: string, keep: string | null, reason: string, at: string, by: string | null) =>
  db.prepare(SS_END_OTHERS).bind(staffId, keep, reason, at, by);
export const endSessionStatement = (db: D1Database, id: string, reason: string, at: string, by: string | null) => db.prepare(SS_END_ONE).bind(id, reason, at, by);
export const insertSessionStatement = (db: D1Database, v: {
  id: string; staffId: string; method: string; single: 0 | 1; trustedDeviceId: string | null; deviceLabel: string; userAgent: string | null; ip: string | null; at: string; expiresAt: string;
}) => db.prepare(SS_INSERT).bind(v.id, v.staffId, v.method, v.single, v.trustedDeviceId, v.deviceLabel, v.userAgent, v.ip, v.at, v.expiresAt);
export const findLiveSession = (db: D1Database, id: string, staffId: string, nowIso: string) => db.prepare(SS_FIND_LIVE).bind(id, staffId, nowIso).first<SessionRow>();
export const touchSessionStatement = (db: D1Database, id: string, nowIso: string, staleBeforeIso: string) => db.prepare(SS_TOUCH).bind(id, nowIso, staleBeforeIso);
export async function liveSessionIds(db: D1Database, staffId: string): Promise<string[]> {
  return (await db.prepare(SS_LIVE_IDS).bind(staffId).all<{ id: string }>()).results.map((r) => r.id);
}
export async function listMySessions(db: D1Database, staffId: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_MINE).bind(staffId).all<SessionRow>()).results;
}
export async function listSessions(db: D1Database, staffId: string | null, liveOnly: boolean, nowIso: string): Promise<SessionRow[]> {
  return (await db.prepare(SS_LIST_ALL).bind(staffId, liveOnly ? 1 : 0, nowIso).all<SessionRow>()).results;
}
export const getSession = (db: D1Database, id: string) => db.prepare(SS_GET).bind(id).first<SessionRow>();
```

- [ ] **Step 2: Test lô SQL trên SQLite thật** — `src/modules/auth/session-repo.test.ts`. Dùng các `defineSql` thật qua một bộ chuyển `node:sqlite` → giao diện `D1Database` tối thiểu (`prepare().bind().run()/first()/all()`, `batch()` chạy tuần tự trong `BEGIN/COMMIT`, lỗi thì `ROLLBACK`). Nếu repo đã có bộ chuyển như vậy (`grep -rn "DatabaseSync" src --include=*.test.ts | grep -i d1`), dùng lại. Ca kiểm:

```ts
test("lô đăng nhập một máy: kết thúc phiên hết hạn → kết thúc phiên sống (bi_thay) → chèn", async () => { /* chèn p1 hết hạn chưa kết thúc + p2 sống; chạy lô; p1.end_reason = 'het_han', p2 = 'bi_thay', p3 sống */ });
test("phiên hết hạn chưa kết thúc KHÔNG chặn lần đăng nhập sau", async () => { /* chỉ p1 hết hạn; lô chèn p2 thành công */ });
test("hai lô đăng nhập cùng lúc (mô phỏng: lô 2 bỏ bước kết thúc) → UNIQUE, cả lô 2 lùi", async () => { /* p2 sống; lô chỉ có INSERT p3 single=1 → throw /UNIQUE/; p2 vẫn sống, không có p3 */ });
test("endOtherSessions giữ đúng phiên được giữ", async () => { /* p1, p2 single=0; end trừ p2 → p1 kết thúc, p2 sống */ });
test("touch chỉ ghi khi last_seen_at cũ hơn 5 phút", async () => { /* changes = 0 khi mới; = 1 khi cũ */ });
```

  Viết đủ thân từng ca (chèn bằng `insertSessionStatement`, đọc bằng `getSession`), không để chú thích thay mã.

- [ ] **Step 3:** Chạy → FAIL (chưa có hàm). Sau Step 1 chạy lại → PASS.
- [ ] **Step 4: Cấp phiên + kiểm phiên** — `src/modules/auth/index.ts`:

```ts
import { SESSION_TTL_SECONDS } from "./session";
import { SESSION_TOUCH_MS, isSingleDevice, sessionDeviceLabel, trimUserAgent, type EndReason } from "./session-ledger";
import { endExpiredSessionsStatement, endOtherSessionsStatement, findLiveSession, insertSessionStatement, liveSessionIds, touchSessionStatement } from "./repository";
import { accountRoleCodesOf } from "../staff"; // hàm MỚI ở Step 5

/** Nhân viên + mã phiên của request, hoặc null. Kiểm: chữ ký → dòng aut_session sống → tài khoản hoạt động (lưới credentials_changed_at). */
export async function currentStaff(request: Request, env: Env): Promise<{ staff: StaffProfile; sessionId: string } | null> {
  const token = getCookie(request, SESSION_COOKIE);
  const t = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  if (!t) return null;
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const [row, staff] = await Promise.all([findLiveSession(env.DB, t.sessionId, t.staffId, nowIso), getActiveStaff(env.DB, t.staffId, t.issuedAt)]);
  if (!row || !staff) return null;
  if (Date.parse(row.last_seen_at) < now - SESSION_TOUCH_MS) {
    await touchSessionStatement(env.DB, row.id, nowIso, new Date(now - SESSION_TOUCH_MS).toISOString()).run().catch((e: unknown) =>
      console.error(JSON.stringify({ level: "error", event: "session_touch_failed", message: e instanceof Error ? e.message : String(e) })));
  }
  return { staff, sessionId: t.sessionId };
}

/**
 * NƠI DUY NHẤT cấp phiên MỚI (ADR-0075 điều 2; đặc tả §6 quy tắc 4). Một lô: dọn phiên hết hạn → (tài khoản một máy) kết thúc phiên còn sống,
 * lý do "bi_thay" → chèn phiên mới. Chỉ mục aut_session_one_live là lưới khi hai lần đăng nhập chạy đua: lần thua nhận 409 sạch.
 */
export async function issueLoginSession(
  request: Request, env: Env, profile: StaffProfile, method: "PIN" | "PIN_MFA" | "PIN_TRUSTED" | "PASSKEY",
  opts: { trustedDeviceId?: string | null; now?: number } = {},
): Promise<{ cookie: string; sessionId: string; endedSessionIds: string[] } | { conflict: Response }> {
  const now = opts.now ?? Date.now();
  const at = new Date(now).toISOString();
  const roles = await accountRoleCodesOf(env.DB, profile.id);
  const single = isSingleDevice(profile.permissions, roles);
  const ended = single ? await liveSessionIds(env.DB, profile.id) : [];
  const id = crypto.randomUUID();
  const ua = request.headers.get("user-agent");
  try {
    await env.DB.batch([
      endExpiredSessionsStatement(env.DB, profile.id, at),
      ...(single ? [endOtherSessionsStatement(env.DB, profile.id, null, "bi_thay", at, null)] : []),
      insertSessionStatement(env.DB, {
        id, staffId: profile.id, method, single: single ? 1 : 0, trustedDeviceId: opts.trustedDeviceId ?? null,
        deviceLabel: sessionDeviceLabel(ua), userAgent: trimUserAgent(ua), ip: request.headers.get("cf-connecting-ip"),
        at, expiresAt: new Date(now + SESSION_TTL_SECONDS * 1000).toISOString(),
      }),
    ]);
  } catch (e) {
    if (e instanceof Error && /UNIQUE/i.test(e.message)) return { conflict: error(409, "session_race", "Tài khoản đang đăng nhập ở máy khác cùng lúc. Thử lại sau vài giây.") };
    throw e;
  }
  return { cookie: sessionCookie(await createSessionToken(env.SESSION_SECRET, profile.id, id, now), isSecure(request)), sessionId: id, endedSessionIds: ended };
}

/** Cấp lại cookie cho phiên ĐANG CÓ (đổi PIN, gỡ Face ID…) — giữ mã phiên, mốc phát hành mới bằng mốc credentials_changed_at vừa ghi. */
export async function reissueSessionCookie(request: Request, env: Env, staffId: string, sessionId: string, issuedAt: number): Promise<string> {
  return sessionCookie(await createSessionToken(env.SESSION_SECRET, staffId, sessionId, issuedAt), isSecure(request));
}

export { endOtherSessionsStatement, liveSessionIds };
export const endAllSessionsStatement = (db: D1Database, staffId: string, reason: EndReason, at: string, by: string | null) =>
  endOtherSessionsStatement(db, staffId, null, reason, at, by);
```

  Xoá `newSessionCookie` (mọi nơi gọi chuyển sang `issueLoginSession` hoặc `reissueSessionCookie` ở Task 3 Step 6 và Task 5). Đổi hai route đăng nhập:

```ts
// POST /api/auth/login — thay dòng return cuối:
const issued = await issueLoginSession(request, env, result.profile, "PIN");
if ("conflict" in issued) return issued.conflict;
ctxDongMayCu(issued.endedSessionIds); // xem Task 6
return json({ staff: result.profile } satisfies MeResponse, 200, { "set-cookie": issued.cookie });
```

  Face ID: như trên với `"PASSKEY"`, giữ `res.headers.append("set-cookie", clearChallengeCookie(request))`. **Bỏ** biến `issuedAt` cũ ở route Face ID; thay chú thích "mốc phiên lấy TRƯỚC khi kiểm" bằng: phiên chỉ được chèn sau khi `markPasskeyUsed` thành công; lần gỡ khoá chạy song song làm `credentials_changed_at` > `created_at` nên lưới `getActiveStaff`/`sessionStatus` vẫn thu hồi. Truyền `opts.now` = mốc lấy **trước** `checkPasskeyAssertion` để giữ nguyên tính chất "phiên không mới hơn lần gỡ khoá" (token `issuedAt` = mốc đó).

- [ ] **Step 5: Hàm đọc vai cho auth** — `src/modules/staff/index.ts` thêm và xuất:

```ts
/** Mã vai tài khoản còn hiệu lực của MỘT tài khoản (ADR-0075 điều 3: auth hỏi vai IT lúc cấp phiên). */
export async function accountRoleCodesOf(db: D1Database, staffId: string): Promise<RoleCode[]> {
  const acct = await getStaffAccount(db, staffId);
  if (!acct) return [];
  return (await accountRoleCodes(db, [acct])).get(staffId) ?? [];
}
```

  (Cạnh `auth → staff` đã có trong `ALLOWED_EDGES`; không thêm cạnh mới. Chạy `node --test src/architecture.test.ts`.)

- [ ] **Step 6: Router** — `src/shared/router.ts`: `currentStaff: (request, env) => Promise<{ staff: StaffProfile; sessionId: string } | null>`; trong handler:

```ts
let staff: StaffProfile | null = null;
let sessionId: string | null = null;
if (hit.r.access !== "public") {
  const cur = await opts.currentStaff(request, env);
  if (!cur) return error(401, "unauthenticated", "Chưa đăng nhập hoặc phiên đã hết hạn.");
  staff = cur.staff;
  sessionId = cur.sessionId;
  // … phần cổng giữ nguyên
}
```

  Thêm `sessionId` vào kiểu ctx của route và vào object truyền cho `hit.r.handler({ … , sessionId })`. Sửa `src/shared/router.test.ts`, `tests/audit/harness.mjs`, mọi hàm `currentStaff` giả trong test (grep `currentStaff:` trong `src` và `tests`) để trả `{ staff, sessionId: "phien-thu" }`.

- [ ] **Step 7:** `npm run typecheck` (0 lỗi) và `npm test` → xanh (trừ e2e chưa chạy). Bài hàng rào đọc mã nguồn (`src/shared/bang-tin.test.ts`, `src/giay-to-khong-lo-so.test.ts`, `src/architecture.test.ts`) phải xanh — nếu đỏ vì đọc đúng dòng đã đổi, sửa bài **cho khớp nghĩa**, ghi lý do vào sổ thi công.
- [ ] **Step 8: Commit** (gộp Task 2 + 3): "Sổ phiên: token có mã phiên, cấp phiên một lô, kiểm phiên mỗi request (ADR-0075 điều 1–3)".

---

### Task 4: Đăng xuất kết thúc dòng phiên + lời báo "bị thay"

**Files:**
- Modify: `src/modules/auth/index.ts` (route `/api/auth/logout`, `GET /api/auth/session-status`), `web/login.ts`, `web/api.ts` (chỗ bắt 401)
- Test: thêm vào `tests/e2e/phien.mjs` (tạo ở Task 9) — ở task này viết bài e2e đỏ trước.

**Interfaces:**
- Produces: `POST /api/auth/logout` (công khai) tự đọc cookie, kết thúc dòng `dang_xuat`; `POST /api/auth/session-ended` (công khai) — nhận cookie cũ, trả `{ reason: string | null, endedAt: string | null }` để trang đăng nhập hiện lời báo (chỉ khi chữ ký token hợp lệ; không lộ gì với token rác).

- [ ] **Step 1: Bài e2e đỏ** (`tests/e2e/phien.mjs`, khung theo `tests/e2e/passkey.mjs`): đăng nhập `salesA` → `POST /api/auth/logout` với cookie → `sql("SELECT end_reason FROM aut_session WHERE staff_id = …")` = `dang_xuat`. Đăng nhập `salesA` máy 1 (UA iPhone) rồi máy 2 (UA Windows) → `GET /api/auth/me` bằng cookie 1 → 401; `POST /api/auth/session-ended` bằng cookie 1 → `reason = "Bị thay bởi máy khác"`, `endedAt` là ISO.
- [ ] **Step 2: Mã** — route:

```ts
route("POST", "/api/auth/logout", "public", async ({ request, env }) => {
  const token = getCookie(request, SESSION_COOKIE);
  const t = token ? await verifySessionToken(env.SESSION_SECRET, token) : null;
  if (t) await endSessionStatement(env.DB, t.sessionId, "dang_xuat", new Date().toISOString(), t.staffId).run();
  return json({ ok: true }, 200, { "set-cookie": clearedSessionCookie(isSecure(request)) });
}),
// Trang đăng nhập hỏi vì sao vừa bị đăng xuất. Chỉ trả khi chữ ký token đúng (cookie của chính máy này) — không lộ gì cho token rác.
route("POST", "/api/auth/session-ended", "public", async ({ request, env }) => {
  const token = getCookie(request, SESSION_COOKIE);
  const t = token ? await verifySessionToken(env.SESSION_SECRET, token, 0) : null; // now = 0: bỏ qua hạn, vẫn kiểm chữ ký
  const row = t ? await getSession(env.DB, t.sessionId) : null;
  const reason = row && row.staff_id === t!.staffId && row.end_reason ? END_REASON_LABEL[row.end_reason as EndReason] : null;
  return json({ reason, endedAt: reason ? row!.ended_at : null });
}),
```

  `verifySessionToken(…, now = 0)`: hàm từ chối `issuedAt > now + 60_000` — với now = 0 sẽ từ chối mọi token. Thêm tham số thứ tư `opts?: { ignoreExpiry?: boolean }` thay vì dùng `now = 0`, và test thuần cho nó ở `session-ledger.test.ts`.

- [ ] **Step 3: Giao diện** — `web/api.ts`: khi gặp 401 ở trang đã đăng nhập, trước khi chuyển về `/login`, gọi `POST /api/auth/session-ended` và lưu `{reason, endedAt}` vào `sessionStorage` (bọc `try/catch`). `web/login.ts`: nếu có, hiện dải thông báo trên form: `Tài khoản vừa đăng nhập trên máy khác lúc HH:MM` (khi reason là "Bị thay bởi máy khác"; giờ VN theo `vnTime` có sẵn trong `src/shared` nếu có, nếu không `toLocaleTimeString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit" })`), hoặc `Phiên đăng nhập đã kết thúc: <reason>.` cho lý do khác. Dựng bằng `h()`, dùng lớp/token có sẵn của dải báo trang đăng nhập.
- [ ] **Step 4:** e2e `npm run test:e2e -- phien` → PASS phần Task 4. `npm run typecheck`, `npm test` xanh.
- [ ] **Step 5: Commit** "Đăng xuất kết thúc dòng phiên; trang đăng nhập báo lý do bị đăng xuất".

---

### Task 5: Mọi thao tác đổi thông tin đăng nhập kết thúc phiên trong cùng lô

**Files:**
- Modify: `src/modules/accounts/index.ts` (7 chỗ ở Task 0 Step 2), `src/modules/staff/index.ts` nếu `setPinStatement` cần trả mốc
- Test: `src/modules/accounts/phien-cung-lo.test.ts` (tạo) — bài đọc mã nguồn kiểu `src/giay-to-khong-lo-so.test.ts`

**Interfaces:**
- Consumes: `endOtherSessionsStatement`, `endAllSessionsStatement`, `reissueSessionCookie`, `ctx.sessionId`.

| Chỗ | Lô thêm | Cookie trả về |
|---|---|---|
| đổi PIN (`/api/account/change-pin`) | `endOtherSessionsStatement(db, staff.id, ctx.sessionId, "doi_pin", at, staff.id)` | `reissueSessionCookie(…, ctx.sessionId, now)` (mốc `now` = mốc ghi vào `setPinStatement`) |
| gỡ mọi Face ID của mình | `…(ctx.sessionId, "doi_face_id")` | `reissueSessionCookie` |
| gỡ một Face ID của mình | `…(ctx.sessionId, "doi_face_id")` | `reissueSessionCookie` |
| đặt PIN bằng Face ID | `…(ctx.sessionId, "doi_pin")` | `reissueSessionCookie` |
| ngưng tài khoản (`PATCH /api/staff/:id`, `active:false`) | `endAllSessionsStatement(db, t.id, "ngung", at, admin.id)` — đặt **cuối** lô, sau câu chốt "còn quản trị viên khác" và thêm điều kiện `EXISTS (SELECT 1 FROM v_stf_staff_label WHERE id = ?1 AND active = 0)` (câu SQL riêng `session_end_all_if_suspended`, khuôn `PK_REVOKE_ALL_IF_SUSPENDED`) | — |
| Quản trị đặt lại PIN | `endAllSessionsStatement(db, t.id, "dat_lai_pin", at, ctx.staff.id)` | — |
| Quản trị gỡ mọi Face ID | `endAllSessionsStatement(db, t.id, "doi_face_id", at, ctx.staff.id)` | — |

- [ ] **Step 1: Bài hàng rào đỏ** — `src/modules/accounts/phien-cung-lo.test.ts`: đọc `src/modules/accounts/index.ts` (và mọi tệp `src/modules/**/index.ts`), tìm mọi khối `db.batch([` / `env.DB.batch([` có chứa `setPinStatement` hoặc `touchCredentialsStatement`; mỗi khối phải chứa `endOtherSessionsStatement` hoặc `endAllSessionsStatement` hoặc `endAllSessionsIfSuspendedStatement`. Thêm ca "không còn `newSessionCookie` ở đâu" (`grep` toàn `src`). Chạy → FAIL.
- [ ] **Step 2:** Sửa 7 chỗ theo bảng. Ở bốn route tự phục vụ, route đã có `ctx.sessionId` (route access `staff`). Không để `sessionId` null ở đó: `if (!sessionId) return error(401, …)`.
- [ ] **Step 3:** Bài hàng rào → PASS. Quan sát chặn thật: xoá tạm `endOtherSessionsStatement` ở route đổi PIN → bài đỏ → hoàn nguyên → xanh. Ghi ngày vào sổ thi công (dùng cho `docs/SO-HANG-RAO.md` ở Task 10).
- [ ] **Step 4:** Bài e2e (thêm vào `tests/e2e/phien.mjs`): `superAdmin` đăng nhập 2 máy → đổi PIN ở máy 1 → máy 2 401, máy 1 vẫn 200; `admin` đặt lại PIN cho `salesA` → phiên `salesA` có `end_reason = 'dat_lai_pin'`.
- [ ] **Step 5:** `npm test`, `npm run typecheck`, `npm run test:e2e -- phien admin passkey` xanh.
- [ ] **Step 6: Commit** "Đổi PIN, gỡ Face ID, ngưng, đặt lại PIN kết thúc phiên trong cùng lô (ADR-0075 điều 4–5)".

---

### Task 6: Máy bị đăng xuất tắt Bảng tin và thông báo màn hình khoá

**Files:**
- Modify: `src/modules/bangtin/index.ts`, `src/modules/bangtin/tram.ts`, `src/shared/bang-tin.ts` (nếu nhãn tính ở đó), `src/shared/router.ts` (kiểu `dongBangTin`), `src/index.ts` (hàm tiêm `dongBangTin`), `src/modules/thongbao/repository.ts`, `src/modules/thongbao/index.ts`, `src/modules/auth/index.ts`, `web/shell.ts`
- Test: `src/modules/bangtin/bat-tay.test.ts`, `src/modules/thongbao/*.test.ts` (nếu có), `tests/e2e/phien.mjs`, `tests/e2e/bangtin.mjs`, `tests/e2e/thongbao.mjs`

**Interfaces:**
- `dongBangTin(muc: { staffId: string; tatThongBao: boolean } | { sessionIds: string[]; staffId: string; giuPhien: string | null } | "tat-ca")`
  - nhánh mới: đóng kết nối mang nhãn `phien:<id>` với mỗi id trong `sessionIds`; tắt `ntf_push_sub` của `staffId` có `session_id IS NULL OR session_id <> giuPhien`, lý do `bi-thay`.
- Bảng tin: nhãn kết nối thêm `phien:<sessionId>` (tối đa 10 nhãn/kết nối — hôm nay ≤ 3).
- Thông báo: `POST /api/account/thong-bao/may` ghi `session_id = ctx.sessionId` và **mở lại** dòng đã bị tắt của cùng `endpoint` cùng tài khoản (kiểm câu SQL hiện tại: nếu là `INSERT … ON CONFLICT(endpoint) DO UPDATE`, thêm `session_id = excluded.session_id, revoked_at = NULL, revoke_reason = NULL`; nếu không, đổi sang dạng đó trong cùng task, có test).

- [ ] **Step 1: Test đỏ**
  - `src/modules/bangtin/bat-tay.test.ts`: yêu cầu gửi trạm có nhãn `phien:<id>` lấy từ `ctx.sessionId`.
  - Bài thuần cho câu `TAT_MAY_TRU_PHIEN` trên SQLite thật: 3 dòng của cùng tài khoản (session NULL, session A, session B), tắt trừ B → chỉ B còn.
  - e2e `phien.mjs`: `salesA` đăng ký máy thông báo bằng cookie 1 (POST `/api/account/thong-bao/may` với endpoint giả như `tests/e2e/thongbao.mjs` làm) → đăng nhập máy 2 → dòng của endpoint 1 `revoked_at` khác NULL, `revoke_reason = 'bi-thay'`.
- [ ] **Step 2: Mã**
  - `bangtin/index.ts`: `const nhan = [...nhanKetNoi(staff), \`phien:${sessionId}\`]` (route nhận `sessionId` từ ctx; null → 401).
  - `tram.ts` `dongCua`: thêm nhánh `if (typeof muc === "object" && Array.isArray(muc.sessionIds)) ds = muc.sessionIds.flatMap((id) => this.ctx.getWebSockets(\`phien:${id}\`));` mã đóng `MA_CAP_NHAT`, lý do `"dang-nhap-may-khac"`.
  - `thongbao/repository.ts`:

```ts
const TAT_MAY_TRU_PHIEN = defineSql("thongbao", "tat_may_tru_phien", `
  UPDATE ntf_push_sub SET revoked_at = ?3, revoke_reason = 'bi-thay', updated_at = ?3, updated_by = NULL
  WHERE staff_id = ?1 AND revoked_at IS NULL AND (session_id IS NULL OR ?2 IS NULL OR session_id <> ?2)`);
export const tatMayTruPhienStatement = (db: D1Database, staffId: string, giuPhien: string | null, at: string) =>
  db.prepare(TAT_MAY_TRU_PHIEN).bind(staffId, giuPhien, at);
```

    và xuất qua `thongbao/index.ts`. Kiểm `revoke_reason` có CHECK danh sách không (`grep -n revoke_reason migrations/*.sql`): nếu có, thêm `'bi-thay'` bằng migration Phần A (cùng tệp `0058` nếu chưa áp, vì Phần A chưa phát hành).
  - `src/index.ts` hàm tiêm `dongBangTin`: nhánh `sessionIds` → `nemNeuLoi([["tram", dongCua(env, { sessionIds })], ["tat-may", tatMayTruPhienStatement(env.DB, staffId, giuPhien, at).run()]])`.
  - `auth/index.ts`: route đăng nhập PIN/Face ID là `public` — router vẫn đưa `dongBangTin` vào ctx (kiểm: `ctx.dongBangTin` có ở route công khai không; nếu không, gọi hàm tiêm qua `exec.waitUntil` như router làm). Sau khi `issueLoginSession` thành công và `single`: `dongBangTin({ staffId, sessionIds: issued.endedSessionIds, giuPhien: issued.sessionId })`. Thay chỗ giữ chỗ `ctxDongMayCu` ở Task 3.
  - `web/shell.ts`: sau khi trang đã đăng nhập tải xong, nếu `Notification.permission === "granted"` và `navigator.serviceWorker` có `pushManager.getSubscription()` khác null → `POST /api/account/thong-bao/may` với `{ endpoint, thietBi }` (giống `web/account.ts:393`) để gắn phiên mới; bọc `try/catch`, không chặn trang. Làm tối đa một lần mỗi lần tải trang (cờ trong `sessionStorage`).
- [ ] **Step 3:** Test → PASS; `npm run test:e2e -- phien bangtin thongbao` xanh. Bài nguồn `src/shared/bang-tin.test.ts` đọc dòng hàm tiêm — giữ đúng biểu thức nó đòi.
- [ ] **Step 4: Commit** "Máy bị đăng xuất: đóng Bảng tin theo phiên, tắt thông báo trừ máy mới, đăng ký lại sau đăng nhập (ADR-0075 điều 6)".

---

### Task 7: Quyền, nhật ký và route xem/gỡ phiên

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `src/modules/auth/index.ts`, `docs/quyen-hoan.json`, `src/route-access.test.ts` / `src/route-write-guard.test.ts` (nếu liệt kê route)
- Test: `src/modules/auth/phien-route.test.ts` (tạo, khuôn `src/modules/accounts/quan-tri-hoi-bang.test.ts`), `tests/e2e/phien.mjs`

**Interfaces:**
- Ô quyền: `"auth.session.viewAll": row("none","none","none","none","none","any","none","none","none","none")`, `"auth.session.revoke"`: cùng giá trị.
- `AUDIT_ACTIONS.session_revoked = { label: "Gỡ phiên đăng nhập", group: "staff" }`; thêm vào `SILENT_AUDIT_ACTIONS`.
- DTO `SessionDto { id; deviceLabel; ip: string | null; method: "PIN" | "PIN_MFA" | "PIN_TRUSTED" | "PASSKEY"; methodLabel; createdAt; lastSeenAt; live: boolean; statusLabel; endedAt: string | null; thisDevice: boolean }`; `StaffSessionDto extends SessionDto { staffId; staffName }`.
- Route:
  - `GET /api/account/sessions` (staff) — 30 phiên gần nhất của mình, `thisDevice = id === ctx.sessionId`.
  - `GET /api/sessions?staffId=&live=1` (admin) — `can(staff, "auth.session.viewAll")` else 403.
  - `POST /api/sessions/:id/revoke` (admin) — `can(staff, "auth.session.revoke")` else 403; body `{ alsoResetPin?: boolean }`; tự gỡ phiên của chính mình → 409 "Dùng nút Đăng xuất".

- [ ] **Step 1: Test đỏ** — `permissions.test.ts`: khoá giá trị hai ô mới (đủ 10 cột) + cập nhật bài đếm ô nếu có. `phien-route.test.ts`: Quản trị (ADMIN, không SUPER_ADMIN) gọi `GET /api/sessions` → 403, `POST /api/sessions/x/revoke` → 403; Nhân sự → 403; Toàn quyền → 200. Bài nhật ký im lặng: `SILENT_AUDIT_ACTIONS` có `session_revoked`.
- [ ] **Step 2: Mã** — route gỡ:

```ts
route("POST", "/api/sessions/:id/revoke", "admin", async (ctx) => {
  if (!can(ctx.staff, "auth.session.revoke")) return error(403, "forbidden", "Chỉ IT/Toàn quyền gỡ được phiên đăng nhập.");
  const db = ctx.env.DB;
  const row = await getSession(db, ctx.params.id!);
  if (!row) return error(404, "not_found", "Không tìm thấy phiên.");
  if (row.id === ctx.sessionId) return error(409, "self_session", "Đây là phiên của chính bạn — dùng nút Đăng xuất.");
  const at = new Date().toISOString();
  const res = await db.batch([
    endSessionStatement(db, row.id, "bi_go", at, ctx.staff.id),
    auditStatement(db, { staffId: ctx.staff.id, action: "session_revoked", at, targetType: "staff", targetId: row.staff_id, detail: `phiên ${row.id}`, guard: "changes() > 0" }),
  ]);
  if ((res[0]?.meta.changes ?? 0) === 0) return error(409, "already_ended", "Phiên này đã kết thúc.");
  ctx.dongBangTin({ staffId: row.staff_id, sessionIds: [row.id], giuPhien: null });
  return json({ ok: true });
}),
```

  Dùng đúng hàm nhật ký hiện có (`auditStatement` / `adminAudit` — xem `accounts/index.ts`; nhật ký **không** có IP/UA). Lưu ý `giuPhien: null` tắt **mọi** máy thông báo của tài khoản đó — chấp nhận (thao tác bảo mật, ADR-0046); ghi vào chú thích. Phần Phần B nối thêm "bỏ máy được tin" (ADR-0075 điều 6c) — để chỗ: `// Phần B: bỏ máy được tin gắn với row.trusted_device_id`.
  Nút gộp "Gỡ phiên + đặt lại PIN": giao diện gọi tuần tự `POST /api/sessions/:id/revoke` rồi `POST /api/staff/:id/reset-pin` (route có sẵn, tự kiểm `account.access.manage` + `mayManage`); không thêm route gộp.
  `docs/quyen-hoan.json`: thêm `GET /api/account/sessions` loại "ngoại lệ", lý do "Tự phục vụ: lịch sử phiên của chính mình (ADR-0075 điều 7); id lấy từ phiên".
- [ ] **Step 3:** Test → PASS; e2e: Toàn quyền gỡ phiên `salesA` → `salesA` 401, `GET /api/audit` bằng `admin` không thấy dòng `session_revoked`, bằng `superAdmin` thấy.
- [ ] **Step 4: Commit** "Quyền + route xem/gỡ phiên đăng nhập, nhật ký im lặng (ADR-0075 điều 7–8)".

---

### Task 8: Mất quyền nhiều máy → còn phiên mới nhất

**Files:**
- Modify: `src/modules/auth/repository.ts` (+1 câu), `src/modules/auth/index.ts` (xuất), `src/modules/accounts/index.ts` (route `PUT /api/staff/:id/permissions`, `PUT /api/staff/:id/roles`)
- Test: `tests/e2e/phien.mjs`, bài SQL ở `session-repo.test.ts`

**Interfaces:**
- `endAllButNewestStatement(db, staffId, at, by)`:

```ts
const SS_END_ALL_BUT_NEWEST = defineSql("auth", "session_end_all_but_newest",
  "UPDATE aut_session SET ended_at = ?2, end_reason = 'mat_mien', ended_by = ?3 WHERE staff_id = ?1 AND ended_at IS NULL AND id <> " +
  "(SELECT id FROM aut_session WHERE staff_id = ?1 AND ended_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 1)");
const SS_MARK_SINGLE = defineSql("auth", "session_mark_single", "UPDATE aut_session SET single = 1 WHERE staff_id = ?1 AND ended_at IS NULL");
```

  Lô đổi quyền/vai khi **trước** được miễn và **sau** không còn: nối cuối lô `[endAllButNewest, markSingle]` (thứ tự này để chỉ mục duy nhất không vỡ). Khi **được thêm** miễn: `UPDATE … SET single = 0 WHERE staff_id = ?1 AND ended_at IS NULL` (câu `session_mark_multi`). Tính trước/sau bằng `isSingleDevice(perms, roles)` với quyền/vai trước và sau lô.

- [ ] **Step 1: Test đỏ** SQL (3 phiên single=0 → lô → 1 sống, 2 `mat_mien`, phiên sống có single=1) + e2e (`superAdmin` mở 2 máy, Toàn quyền khác bỏ quyền SUPER_ADMIN của tài khoản đó → còn đúng 1 phiên sống). Tài khoản e2e Toàn quyền thứ hai: thêm vào `tests/e2e/lib.mjs` nếu chưa có (kiểm luật "không bỏ Toàn quyền cuối cùng").
- [ ] **Step 2:** Mã. **Step 3:** PASS. **Step 4: Commit** "Mất quyền nhiều máy thì chỉ còn phiên mới nhất (ADR-0075 điều 3)".

---

### Task 9: Giao diện — lịch sử của tôi + màn Phiên đăng nhập; e2e toàn bộ

**Files:**
- Create: `web/sessions.ts`, `public/sessions.html`
- Modify: `web/account.ts`, `web/shell.ts` (mục menu chỉ khi `can(me, "auth.session.viewAll")`), `src/shared/sw-policy.ts` (`PAGES`), `package.json` (script `build:web`), `src/shared/so-do-trang.ts` (nếu liệt kê trang), Trợ giúp (`src/shared/huong-dan*.ts`), `tests/e2e/lib.mjs`
- Test: `src/giao-dien-hoi-bang-quyen.test.ts` phải xanh; kịch bản Chrome mới ở `docs/evidence/2026-10-01-dang-nhap-a/kich-ban/phien.mjs` (khuôn `docs/evidence/2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs`)

- [ ] **Step 1: e2e `session()` nhớ cookie** — `tests/e2e/lib.mjs`:

```js
const PHIEN_DA_CO = new Map(); // phone → cookie. Luật một máy: đăng nhập lại cùng tài khoản đá cookie cũ — kịch bản dùng chung MỘT phiên mỗi tài khoản.
/** Cookie phiên của tài khoản test (đăng nhập một lần, dùng lại). Bài cần phiên MỚI (thử đăng nhập, thử bị đá) gọi `login()` hoặc `sessionMoi()`. */
export async function session(account) {
  const co = PHIEN_DA_CO.get(account.phone);
  if (co && (await call(co, "GET", "/api/auth/me")).status === 200) return co;
  const cookie = await sessionMoi(account);
  return cookie;
}
export async function sessionMoi(account) {
  const r = await login(account.phone, account.pin);
  if (r.status !== 200) throw new Error(`Không đăng nhập được ${account.phone}: ${r.status} ${JSON.stringify(r.body)}`);
  PHIEN_DA_CO.set(account.phone, r.cookie);
  return r.cookie;
}
```

  (Kiểm chữ ký `call()` thật trong `lib.mjs`.) Chạy **toàn bộ** `npm run test:e2e`. Mỗi kịch bản đỏ vì "cookie cũ bị đá": sửa kịch bản dùng `session()` một lần, hoặc `sessionMoi()` khi cố ý. **Không** thêm cờ tắt luật. Ghi danh sách kịch bản đã sửa vào sổ thi công.
- [ ] **Step 2: Lịch sử của tôi** — `web/account.ts`: khối "Phiên đăng nhập của tôi" (danh sách từ `GET /api/account/sessions`: tên máy, IP, lúc đăng nhập, lần cuối hoạt động, trạng thái; dòng `thisDevice` ghi "Máy này"); nút "Đăng xuất" (gọi `/api/auth/logout` rồi về `/login`). Dòng chú thích: "Ứng dụng đã cài và Safari trên cùng một iPhone tính là hai máy."
- [ ] **Step 3: Màn Phiên đăng nhập** — `web/sessions.ts`: lọc theo tài khoản (ô tìm tên) + công tắc "Chỉ phiên đang hiệu lực"; bảng/thẻ theo khuôn trang Quản lý tài khoản; nút "Gỡ phiên" và "Gỡ phiên + đặt lại PIN" trong **hộp xác nhận trong trang** (không `confirm()`); sau gỡ tải lại danh sách. Menu chỉ hiện khi máy chủ nói có ô `auth.session.viewAll` (theo luật "giao diện hỏi bảng quyền" — xem `web/CLAUDE.md` và `src/giao-dien-hoi-bang-quyen.test.ts`).
- [ ] **Step 4:** `npm run build:web`, `npm run typecheck`, `npm test`, `npm run test:e2e` (toàn bộ) xanh. Chạy kịch bản Chrome (tài khoản nào mở trang SAU CÙNG — CLAUDE.md §10): đăng nhập 2 cửa sổ cùng tài khoản thường → cửa sổ 1 về trang đăng nhập với lời báo; Toàn quyền mở màn Phiên đăng nhập, gỡ một phiên. Lưu ảnh vào `docs/evidence/2026-10-01-dang-nhap-a/`.
- [ ] **Step 5: Commit** "Giao diện phiên đăng nhập: lịch sử của tôi, màn IT/Toàn quyền, e2e một phiên mỗi tài khoản".

---

### Task 10: Bất biến, sổ hàng rào, tài liệu, nhật ký phiên bản; kiểm độc lập

**Files:**
- Modify: `scripts/audit-invariants.mjs`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (§4 phiên, §5 bảng, §7 API, §8 quyền), `docs/CHANGE-GUIDE.md` (công thức mới "cấp phiên" + bẫy: token đổi định dạng → mọi người đăng nhập lại; `session()` e2e nhớ cookie), `src/shared/changelog.ts` (mục phiên bản kế tiếp, lời thường ≤ 160 ký tự/dòng), `CLAUDE.md` §10 (chỉ được tự sửa số/tên tệp — **không** tự thêm bẫy mới; đề xuất dòng bẫy bằng diff trong sổ thi công cho chủ duyệt)

- [ ] **Step 1:** `audit-invariants`: bất biến `R-AUT-SESSION-1`: không tài khoản nào có > 1 dòng `aut_session` với `ended_at IS NULL AND single = 1 AND expires_at > now`; `R-AUT-SESSION-2`: không dòng nào `ended_at IS NULL` thuộc tài khoản `active = 0` (đọc qua view `v_stf_staff_label`). Chạy `node scripts/audit-invariants.mjs --db local` sau e2e → thoát 0.
- [ ] **Step 2:** `docs/SO-HANG-RAO.md`: dòng "một phiên sống mỗi tài khoản (chỉ mục duy nhất + lô máy chủ)" (quan sát chặn: bài (b) migration — tạm bỏ `WHERE` của chỉ mục thì bài khác đỏ; ghi ngày), dòng "mọi lô đổi thông tin đăng nhập kết thúc phiên" (Task 5 Step 3), dòng "ô xem/gỡ phiên chỉ Toàn quyền" (bài 403 — quan sát: tạm đổi ô ADMIN sang any → đỏ → hoàn nguyên).
- [ ] **Step 3:** Tài liệu mô tả + nhật ký phiên bản ("Mỗi tài khoản chỉ đăng nhập một máy; máy mới vào thì máy cũ tự đăng xuất. Mọi người cần đăng nhập lại một lần.").
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local` xanh — dán số vào sổ thi công.
- [ ] **Step 5: Commit**, rồi giao **người kiểm độc lập** (`nguoi-kiem-doc-lap`, chỉ đọc): đọc ADR-0075 + đặc tả §5b/§6/§11 15–20 + mã; tự chạy lại bốn lệnh ở Step 4; báo phát hiện. Chỉ báo "đạt" dựa trên báo cáo đó.

**Lưu ý phát hành (cho chủ):** Phần A đổi định dạng phiên → **mọi người đăng nhập lại một lần**. Phần B (lớp hai) không đổi định dạng phiên nên không bắt đăng nhập lại lần nữa; nhưng nên phát hành B **trong cùng bản hoặc ngay sau** A để 14 ngày ân hạn bắt đầu từ lần đăng nhập lại này (ADR-0075 Hệ quả).
