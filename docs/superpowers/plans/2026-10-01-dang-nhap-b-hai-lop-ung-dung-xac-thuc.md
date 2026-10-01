# Phần B — Bảo mật hai lớp bằng ứng dụng xác thực + mã dự phòng + máy được tin (ADR-0074) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đăng nhập bằng PIN trên máy chưa tin phải nhập thêm mã 6 số từ ứng dụng xác thực (Google Authenticator…) hoặc một mã dự phòng; bắt buộc với tài khoản nội bộ sau 14 ngày ân hạn; Quản trị/Toàn quyền tắt lớp hai cho người mất máy.

**Architecture:** PIN đúng → nếu tài khoản cần lớp hai và trình duyệt không mang cookie máy được tin hợp lệ → không cấp phiên, trả `next: "mfa"` + cookie chờ `td_mfa_pending` (ký bằng khoá dẫn xuất riêng, 5 phút). `POST /api/auth/mfa/verify` kiểm mã (TOTP chống dùng lại bằng một câu `UPDATE … WHERE last_totp_step < ?`; mã dự phòng dùng một lần) rồi gọi `issueLoginSession` của Phần A. Khoá TOTP mã hoá AES-GCM bằng bí mật `MFA_ENCRYPTION_KEY`.

**Tech Stack:** TypeScript, Workers + D1, Web Crypto (HMAC-SHA1, AES-GCM, SHA-256), `node --test`, e2e, giao diện `h()`.

**Spec:** `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (§3, §4, §5, §6, §7, §11 mục 1–14, §13) + `docs/adr/ADR-0074-xac-thuc-hai-lop.md`.

**Điều kiện bắt đầu:** Phần A (`docs/superpowers/plans/2026-10-01-dang-nhap-a-so-phien-mot-may.md`) đã gộp vào nhánh và kiểm độc lập ĐẠT. **Task 6 (ân hạn) chỉ bắt đầu khi chủ đã xác nhận** điểm bổ sung "tài khoản nội bộ tạo sau phát hành / mới được cấp quyền nội bộ có 14 ngày từ lúc đó" (ADR-0074 điều 1, mục bổ sung sau duyệt).

## Global Constraints

- Như Phần A (tiếng Việt có dấu, không dependency runtime npm mới, `h()`, token CSS, ô 16px, `defineSql`, ISO UTC, không xoá cứng, không nới luật cho test, không push/merge/deploy).
- Migration: số = lớn nhất trong `migrations/` sau khi gộp main + 1; bài kiểm tìm theo đuôi `_aut_mfa.sql`.
- TOTP: RFC 6238, HMAC-SHA1, 6 số, bước 30 giây, chấp nhận bước −1/0/+1; khoá 20 byte ngẫu nhiên; chuỗi `otpauth://totp/Tour%20%C4%90%E1%BA%A3o:<tên>?secret=<BASE32>&issuer=Tour%20%C4%90%E1%BA%A3o&digits=6&period=30` — **không** chứa SĐT.
- Mã dự phòng: 10 mã, mỗi mã 8 ký tự từ bảng `23456789abcdefghjkmnpqrstuvwxyz`, hiện dạng `xxxx-xxxx`; lưu `SHA-256("<staffId>:<mã chuẩn hoá>")`.
- Cookie chờ `td_mfa_pending`: 5 phút; máy được tin `td_trusted`: 30 ngày, token 32 byte ngẫu nhiên, DB giữ `SHA-256`.
- Hạn mức: khoá `mfa:<staffId>` 5 lần sai / 15 phút (dùng `reserveAttempts`); mã đúng xoá bộ đếm.
- Không bao giờ ghi khoá TOTP, mã, mã dự phòng, token máy được tin vào nhật ký, câu lỗi, DTO.
- Nhân viên nội bộ = giữ ít nhất một quyền ngoài `EXTERNAL_PERMISSIONS` (`src/shared/permissions.ts`) — viết hàm, không viết danh sách tay.

## Review Focus

1. **Người dùng iPhone không quét được QR trên chính màn hình mình** → trang bật có nút "Mở ứng dụng xác thực" (liên kết `otpauth://`) + nút "Chép khoá"; thử trên iPhone thật. Bài: Task 7 bước kịch bản tay.
2. **Đồng hồ điện thoại lệch 30–60 giây** → mã bước ±1 vẫn nhận; sai nhiều lần thì lời nhắc "kiểm giờ tự động". Bài: Task 1 (thuần, bước ±1 và ±2).
3. **Kẻ có PIN tự tạo cookie chờ mới để né hạn mức** → đếm theo tài khoản. Bài: Task 4 e2e "5 lần sai, mỗi lần cookie chờ mới → 429".
4. **Mã TOTP vừa dùng bị dùng lại (người đứng sau lưng chụp màn hình)** → 401. Bài: Task 4 e2e + Task 2 SQL thuần.
5. **Tài khoản nội bộ không có hạn ân hạn (NULL) và chưa bật** → bị chặn (đóng cửa an toàn), và `audit-invariants` báo. Bài: Task 6.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| `migrations/0059_aut_mfa.sql` (tạo — số theo luật) | `aut_mfa_factor`, `aut_mfa_recovery_code`, `aut_trusted_device`, `staff.mfa_grace_until`, gieo hạn ân hạn cho tài khoản nội bộ hiện có |
| `src/migrations-aut-mfa.test.ts` (tạo) | Kiểm migration |
| `src/modules/auth/totp.ts` (+test) | Base32, TOTP, chuỗi `otpauth://` |
| `src/modules/auth/mfa-crypto.ts` (+test) | AES-GCM khoá TOTP, băm mã dự phòng/token máy tin, sinh mã dự phòng |
| `src/modules/auth/mfa-rules.ts` (+test) | `mfaRequired`, `allowedFactors`, quyết định ở bước đăng nhập, cookie chờ |
| `src/modules/auth/mfa-repo.ts` (+test SQLite) | SQL ba bảng mới |
| `src/modules/auth/index.ts` | Cổng lớp hai trong đăng nhập PIN; route `/api/auth/mfa/*`, `/api/account/mfa/*` |
| `src/modules/staff/*` | Cột `mfa_grace_until` trong đọc/ghi tài khoản; đặt hạn khi tạo / cấp quyền nội bộ |
| `src/modules/accounts/index.ts` | Route Quản trị tắt lớp hai; nhãn trạng thái trong danh sách |
| `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `src/shared/permissions.ts` (không ô mới — dùng `account.access.manage`, `admin.manage.superadmin`) | DTO, nhật ký `mfa_enabled`, `mfa_removed`, `mfa_reset`, `mfa_recovery_regenerated` |
| `web/login.ts`, `web/account.ts`, `web/staff.ts`, `web/shell.ts`, `web/vendor/qrcode.js` (tạo — xem Task 7) | Bước 2 đăng nhập; khối Bảo mật đăng nhập; nhãn + nút tắt; dải nhắc ân hạn |
| `worker-configuration.d.ts`, `.dev.vars.example` | `MFA_ENCRYPTION_KEY` |
| `tests/e2e/lib.mjs`, `tests/e2e/hai-lop.mjs` (tạo), `tests/e2e/fake-totp.mjs` (tạo) | Bộ tính mã TOTP cho e2e; kịch bản |
| `scripts/audit-invariants.mjs`, tài liệu, `docs/SO-HANG-RAO.md`, `src/shared/changelog.ts` | Bất biến + tài liệu |

---

### Task 0: Đồng bộ nhánh

- [ ] **Step 1:** Gộp `main` (đã có Phần A). Số migration = lớn nhất + 1 (kiểm cả nhánh chưa gộp như Phần A Task 0). Ghi vào sổ `docs/superpowers/plans/2026-10-01-dang-nhap-thi-cong-nhat-ky.md`.
- [ ] **Step 2:** Chụp lại nơi đụng: `grep -n "issueLoginSession\|/api/auth/login\|reset-pin\|EXTERNAL_PERMISSIONS\|createAccountStatements\|setPermissionStatements" -r src`. Ghi vào sổ.
- [ ] **Step 3:** `npm test`, `npm run typecheck` xanh.

---

### Task 1: TOTP thuần (RFC 6238)

**Files:** Create `src/modules/auth/totp.ts`, `src/modules/auth/totp.test.ts`

**Interfaces:**
- `base32Encode(bytes: Uint8Array): string` (RFC 4648, không `=`), `base32Decode(s: string): Uint8Array` (bỏ khoảng trắng, không phân biệt hoa thường; ký tự lạ → ném `Error`)
- `totpCode(secret: Uint8Array, step: number, digits?: number): Promise<string>`
- `matchTotp(secret: Uint8Array, code: string, nowMs: number): Promise<number | null>` — trả **bước** khớp trong {−1, 0, +1} quanh bước hiện tại, hoặc null
- `otpauthUri(secretB32: string, accountLabel: string): string`
- `TOTP_PERIOD = 30`

- [ ] **Step 1: Test đỏ**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { base32Decode, base32Encode, matchTotp, otpauthUri, totpCode } from "./totp.ts";

const SEED = new TextEncoder().encode("12345678901234567890"); // RFC 6238 phụ lục B, SHA-1

test("RFC 6238 phụ lục B (SHA-1, 8 số) và 6 số = 6 số cuối", async () => {
  const cases: [number, string][] = [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"], [1234567890, "89005924"], [2000000000, "69279037"]];
  for (const [t, eight] of cases) {
    assert.equal(await totpCode(SEED, Math.floor(t / 30), 8), eight, `T=${t}`);
    assert.equal(await totpCode(SEED, Math.floor(t / 30)), eight.slice(-6), `T=${t} (6 số)`);
  }
});

test("base32 hai chiều; bỏ khoảng trắng, chữ thường; ký tự lạ bị từ chối", () => {
  const b = crypto.getRandomValues(new Uint8Array(20));
  const s = base32Encode(b);
  assert.match(s, /^[A-Z2-7]{32}$/);
  assert.deepEqual(base32Decode(s.toLowerCase().replace(/(.{4})/g, "$1 ")), b);
  assert.throws(() => base32Decode("ABC1"));
});

test("chấp nhận bước −1/0/+1, từ chối ±2; mã không phải 6 số → null", async () => {
  const now = 1_700_000_000_000;
  const step = Math.floor(now / 30_000);
  for (const d of [-1, 0, 1]) assert.equal(await matchTotp(SEED, await totpCode(SEED, step + d), now), step + d);
  for (const d of [-2, 2]) assert.equal(await matchTotp(SEED, await totpCode(SEED, step + d), now), null);
  assert.equal(await matchTotp(SEED, "12345", now), null);
  assert.equal(await matchTotp(SEED, "abcdef", now), null);
});

test("otpauth:// không chứa SĐT, có issuer Tour Đảo", () => {
  const u = otpauthUri("JBSWY3DPEHPK3PXP", "Nguyễn Văn A");
  assert.match(u, /^otpauth:\/\/totp\//);
  assert.match(u, /secret=JBSWY3DPEHPK3PXP/);
  assert.match(u, /issuer=Tour%20%C4%90%E1%BA%A3o/);
  assert.doesNotMatch(u, /09\d{8}/);
});
```

- [ ] **Step 2:** `node --test src/modules/auth/totp.test.ts` → FAIL.
- [ ] **Step 3: Mã**

```ts
// TOTP (RFC 6238, HMAC-SHA1, 6 số, bước 30 giây) — THUẦN, Web Crypto. ADR-0074 điều 2.
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_PERIOD = 30;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0, value = 0, out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Uint8Array {
  const clean = s.replace(/[\s=]/g, "").toUpperCase();
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const i = B32.indexOf(ch);
    if (i < 0) throw new Error("base32 không hợp lệ");
    value = (value << 5) | i;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return new Uint8Array(out);
}

export async function totpCode(secret: Uint8Array, step: number, digits = 6): Promise<string> {
  const msg = new Uint8Array(8);
  let x = step;
  for (let i = 7; i >= 0; i--) { msg[i] = x & 255; x = Math.floor(x / 256); }
  const key = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const h = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const o = h[h.length - 1]! & 15;
  const bin = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(bin % 10 ** digits).padStart(digits, "0");
}

export async function matchTotp(secret: Uint8Array, code: string, nowMs: number): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const step = Math.floor(nowMs / (TOTP_PERIOD * 1000));
  for (const d of [0, -1, 1]) if ((await totpCode(secret, step + d)) === code) return step + d;
  return null;
}

export function otpauthUri(secretB32: string, accountLabel: string): string {
  const issuer = "Tour Đảo";
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&digits=6&period=${TOTP_PERIOD}`;
}
```

  (So sánh chuỗi 6 số không cần thời gian hằng: kẻ dò bị hạn mức 5 lần/15 phút; ghi chú này vào chú thích hàm.)
- [ ] **Step 4:** PASS. **Step 5: Commit** "TOTP thuần theo RFC 6238 (ADR-0074)".

---

### Task 2: Mật mã phụ trợ + migration + SQL

**Files:**
- Create: `src/modules/auth/mfa-crypto.ts` (+`.test.ts`), `migrations/0059_aut_mfa.sql`, `src/migrations-aut-mfa.test.ts`, `src/modules/auth/mfa-repo.ts`, `src/modules/auth/mfa-repo.test.ts`
- Modify: `worker-configuration.d.ts` (`MFA_ENCRYPTION_KEY?: string`), `.dev.vars.example`, `docs/data-dictionary.json` (+ `npm run dict`)

**Interfaces:**
- `mfa-crypto.ts`: `encryptSecret(keyB64: string, plain: Uint8Array): Promise<string>` (định dạng `v1.<iv>.<ct>` base64url); `decryptSecret(keyB64, enc): Promise<Uint8Array>`; `sha256Hex(s: string): Promise<string>`; `newRecoveryCodes(): string[]` (10 mã `xxxx-xxxx`); `normalizeRecoveryCode(s: string): string | null` (bỏ `-`/khoảng trắng, chữ thường, đúng 8 ký tự trong bảng); `recoveryHash(staffId, normalized)`; `newTrustedToken(): string` (32 byte base64url); `checkMfaKey(env): string | null` (thiếu/sai độ dài → câu lỗi cho log, không in khoá).
- Migration:

```sql
-- Migration 0059 — ADR-0074 (accepted 2026-10-01): bảo mật hai lớp. Yếu tố thuộc TÀI KHOẢN (module auth), không thuộc hồ sơ (điều 4).
CREATE TABLE aut_mfa_factor (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  kind TEXT NOT NULL CHECK (kind IN ('TOTP', 'EMAIL')),
  secret_enc TEXT,              -- TOTP: khoá mã hoá AES-GCM (v1.iv.ct); EMAIL: NULL
  email TEXT,                   -- EMAIL (Phần C): địa chỉ đã xác nhận; TOTP: NULL
  last_totp_step INTEGER NOT NULL DEFAULT 0,
  valid_from_at TEXT NOT NULL,
  valid_to_at TEXT,
  created_at TEXT NOT NULL,
  created_by TEXT REFERENCES staff(id),
  updated_at TEXT NOT NULL,
  updated_by TEXT REFERENCES staff(id),
  CHECK ((kind = 'TOTP' AND secret_enc IS NOT NULL AND email IS NULL) OR (kind = 'EMAIL' AND email IS NOT NULL AND secret_enc IS NULL))
);
CREATE UNIQUE INDEX aut_mfa_factor_one_live ON aut_mfa_factor (staff_id, kind) WHERE valid_to_at IS NULL;
CREATE TABLE aut_mfa_recovery_code (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  batch_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT
);
CREATE UNIQUE INDEX aut_mfa_recovery_hash ON aut_mfa_recovery_code (staff_id, code_hash);
CREATE TABLE aut_trusted_device (
  id TEXT PRIMARY KEY,
  staff_id TEXT NOT NULL REFERENCES staff(id),
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  revoke_reason TEXT CHECK (revoke_reason IS NULL OR revoke_reason IN ('quen_may', 'quen_moi_may', 'doi_pin', 'dat_lai_pin', 'tat_hai_lop', 'bi_go', 'ngung'))
);
CREATE INDEX aut_trusted_device_staff ON aut_trusted_device (staff_id, revoked_at);
ALTER TABLE staff ADD COLUMN mfa_grace_until TEXT;   -- hạn ân hạn 14 ngày (tự bật trong phiên)
ALTER TABLE staff ADD COLUMN mfa_enroll_until TEXT;  -- cửa sổ 24 giờ sau khi Quản trị/Toàn quyền tắt lớp hai (bật lại ngay ở bước đăng nhập)
-- Ân hạn 14 ngày cho tài khoản NỘI BỘ đang hoạt động (ADR-0074 điều 1), tính từ lúc migration áp = lúc phát hành.
-- "Nội bộ" = có ít nhất một quyền đang hiệu lực ngoài PARTNER, DRIVER_PARTNER (khớp EXTERNAL_PERMISSIONS — bài (c) đối chiếu).
UPDATE staff SET mfa_grace_until = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+14 days')
WHERE active = 1 AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id = staff.id AND p.permission_code NOT IN ('PARTNER', 'DRIVER_PARTNER') AND p.valid_to_at IS NULL);
```

  **Trước khi viết câu UPDATE**, kiểm tên cột thật của `stf_permission` (`grep -n "CREATE TABLE stf_permission" -A15 migrations/*.sql`) — tên cột mã quyền và cột hiệu lực có thể khác (`code`, `valid_to`…); sửa câu cho đúng. Bài (c) của test migration so tập tài khoản được gieo hạn với hàm TS `isInternal(perms)` trên dữ liệu mẫu (tài khoản chỉ PARTNER, chỉ DRIVER_PARTNER, SALES, HR, PARTNER bị gỡ còn SALES).

- [ ] **Step 1: Test đỏ** `mfa-crypto.test.ts` (mã hoá–giải hai chiều; khoá sai → ném; 10 mã khác nhau đúng dạng `^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$`; chuẩn hoá `" ABCD-efgh "` → null vì `a`,`b` ... kiểm đúng bảng ký tự), `migrations-aut-mfa.test.ts` (đúng một tệp; hai yếu tố TOTP sống cùng người → UNIQUE; CHECK kind/secret/email; gieo hạn (c)), `mfa-repo.test.ts` (SQLite thật: câu chống dùng lại TOTP chỉ đổi khi `last_totp_step < ?`; dùng mã dự phòng hai lần → lần hai `changes = 0`; máy tin hết hạn/thu hồi không khớp).
- [ ] **Step 2:** FAIL. **Step 3: Mã** `mfa-repo.ts` với các câu (tất cả qua `defineSql("auth", …)`):
  - `factor_list_live(staff_id)`; `factor_insert(...)`; `factor_end(id, staff_id, at, by)` (đặt `valid_to_at`); `factor_end_all(staff_id, at, by)`;
  - `totp_consume(id, step, at)`: `UPDATE aut_mfa_factor SET last_totp_step = ?2, updated_at = ?3 WHERE id = ?1 AND valid_to_at IS NULL AND last_totp_step < ?2` — người gọi đòi `changes = 1`;
  - `recovery_insert(...)`, `recovery_revoke_all(staff_id, at)`, `recovery_use(staff_id, code_hash, at)`: `UPDATE … SET used_at = ?3 WHERE staff_id = ?1 AND code_hash = ?2 AND used_at IS NULL AND revoked_at IS NULL`, `recovery_count_left(staff_id)`;
  - `trusted_insert(...)`, `trusted_find(token_hash, staff_id, now)` (sống, chưa hết hạn), `trusted_touch(id, at)`, `trusted_revoke(id, staff_id, reason, at)`, `trusted_revoke_all(staff_id, reason, at)`, `trusted_list(staff_id)`.
  Mã hoá dùng `crypto.subtle` AES-GCM 256, IV 12 byte ngẫu nhiên.
- [ ] **Step 4:** PASS; `npm run dict`. **Step 5: Commit** "Bảng yếu tố hai lớp, mã dự phòng, máy được tin + mật mã phụ trợ (ADR-0074)".

---

### Task 3: Luật bước đăng nhập + cookie chờ

**Files:** Create `src/modules/auth/mfa-rules.ts`, `src/modules/auth/mfa-rules.test.ts`

**Interfaces:**
- `isInternal(perms: readonly PermissionCode[]): boolean` = `perms.some((p) => !EXTERNAL_PERMISSIONS.includes(p))`
- `allowedFactors(perms): ("TOTP" | "EMAIL")[]` — `ADMIN`/`SUPER_ADMIN`/`ACCOUNTING` → `["TOTP"]`; còn lại `["TOTP", "EMAIL"]` (ADR-0074 điều 7)
- `loginStep(input: { perms; hasFactor: boolean; trusted: boolean; graceUntil: string | null; enrollUntil: string | null; nowIso: string }): "session" | "mfa" | "enroll" | "blocked_no_factor"`
  - có yếu tố: `trusted ? "session" : "mfa"`
  - không yếu tố, `enrollUntil > nowIso` (vừa bị Quản trị tắt): `"enroll"` — kể cả tài khoản bên ngoài đã từng bật
  - không yếu tố, không nội bộ: `"session"`
  - không yếu tố, nội bộ: `graceUntil !== null && graceUntil > nowIso ? "session" : "blocked_no_factor"`
- `mfaBanner(input): { required: boolean; graceUntil: string | null } ` cho `/api/auth/me`.
- Cookie chờ: `createPendingToken(secret, staffId, purpose: "verify" | "enroll", nowMs)`, `verifyPendingToken(secret, token, nowMs) → { staffId; purpose; issuedAt } | null`; khoá ký = `HMAC(SESSION_SECRET, "td-mfa-pending-v1")` (dẫn xuất); payload `mfa1.<staffId>.<iat>.<purpose>`; TTL 300 giây; tên cookie `td_mfa_pending`, `HttpOnly; SameSite=Lax; Path=/api/auth/mfa; Max-Age=300` (+`Secure` khi https).
  - `purpose = "enroll"`: dùng cho cửa sổ 24 giờ sau khi Quản trị tắt lớp hai (Task 6) — chỉ mở được route bật yếu tố ở bước đăng nhập.

- [ ] **Step 1: Test đỏ** — gồm: bảng `loginStep` đủ các tổ hợp (có/không yếu tố × tin/không tin × nội bộ/bên ngoài × còn/hết ân hạn × trong/ngoài cửa sổ 24 giờ); `allowedFactors` cho từng mã quyền (kể cả `HR` → hai yếu tố); **token chờ đưa vào `verifySessionToken` → null** và token phiên đưa vào `verifyPendingToken` → null; hết 300 giây → null; sửa `purpose` → null.
- [ ] **Step 2:** FAIL. **Step 3:** Mã. **Step 4:** PASS. **Step 5: Commit** "Luật bước đăng nhập hai lớp + cookie chờ khoá riêng".

---

### Task 4: Cổng lớp hai ở đăng nhập PIN + route xác minh

**Files:** Modify `src/modules/auth/index.ts`, `src/shared/contracts.ts`, `src/modules/staff/*` (hàm riêng `mfaDeadlinesOf(db, id): Promise<{ graceUntil: string | null; enrollUntil: string | null }>` xuất từ `staff`); Create `tests/e2e/fake-totp.mjs`, `tests/e2e/hai-lop.mjs`; Modify `tests/e2e/run.mjs` (thêm kịch bản), `src/giay-to-khong-lo-so.test.ts` hoặc bài không-lộ tương đương (thêm ca route mới)

**Interfaces:**
- `POST /api/auth/login` trả một trong: `200 { staff }` + `td_session` (như cũ); `200 { next: "mfa", factors: ("TOTP"|"RECOVERY"|"EMAIL")[], emailMask: string | null }` + `td_mfa_pending` (verify); `403 { error: { code: "mfa_setup_required", message: "Tài khoản cần bật bảo mật hai lớp. Liên hệ Quản trị để được hỗ trợ." } }`; `200 { next: "mfa_enroll" }` + cookie chờ purpose `enroll` (cửa sổ 24 giờ, Task 6).
- `POST /api/auth/mfa/verify` (public) body `{ method: "TOTP" | "RECOVERY", code: string, trustDevice: boolean }` → `200 { staff, recoveryLeft?: number }` + `td_session` (+`td_trusted`) + xoá `td_mfa_pending`; `401 invalid_code` "Mã không đúng hoặc đã dùng. Kiểm giờ tự động trên điện thoại nếu sai nhiều lần."; `429` như PIN; `401 mfa_expired` "Đã quá 5 phút, đăng nhập lại."
- `tests/e2e/fake-totp.mjs`: `totp(secretB32, nowMs = Date.now())` (bản JS của `totpCode`, dùng `node:crypto` `createHmac("sha1")`).

- [ ] **Step 1: e2e đỏ** `tests/e2e/hai-lop.mjs` — chuẩn bị: `salesA` bật TOTP qua route Task 5 (hoặc, nếu Task 5 chưa có, gieo bằng `sql()` một dòng `aut_mfa_factor` với `secret_enc` mã hoá bằng khoá `.dev.vars` e2e — **ưu tiên** làm Task 5 trước Task 4 nếu tiện; thứ tự task 4/5 có thể đảo). Ca: (1) PIN đúng → `next: "mfa"`, không có `td_session`; (2) mã đúng → 200 + `td_session`; (3) dùng lại đúng mã đó ở lần đăng nhập mới → 401; (4) 5 mã sai, mỗi lần đăng nhập PIN lại để có cookie chờ mới → lần 6: 429; (5) `td_mfa_pending` gửi tới `GET /api/auth/me` → 401; (6) Face ID (`tests/e2e/fake-authenticator.mjs`) → không bị hỏi; (7) `trustDevice: true` → lần đăng nhập PIN sau gửi kèm `td_trusted` → `{ staff }` ngay, sổ phiên `method = 'PIN_TRUSTED'`; (8) bảo trì bật (khuôn `tests/e2e/maintenance.mjs`) → `/api/auth/mfa/verify` của tài khoản không phải Toàn quyền → 503.
- [ ] **Step 2: Mã** — trong `POST /api/auth/login` sau `verifyPinThrottled` thành công:

```ts
const now = Date.now();
const nowIso = new Date(now).toISOString();
const factors = await listLiveFactors(env.DB, result.profile.id);
const trustedTok = getCookie(request, TRUSTED_COOKIE);
const trusted = trustedTok ? await findTrustedDevice(env.DB, await sha256Hex(trustedTok), result.profile.id, nowIso) : null;
const trustedOk = trusted !== null && (await getActiveStaff(env.DB, result.profile.id, Date.parse(trusted.created_at))) !== null; // lưới credentials_changed_at
const { graceUntil, enrollUntil } = await mfaDeadlinesOf(env.DB, result.profile.id);
const step = loginStep({ perms: result.profile.permissions, hasFactor: factors.length > 0, trusted: trustedOk, graceUntil, enrollUntil, nowIso });
if (step === "blocked_no_factor") return error(403, "mfa_setup_required", "Tài khoản cần bật bảo mật hai lớp. Liên hệ Quản trị để được hỗ trợ.");
if (step === "enroll") return startEnrollStep(request, env, result.profile, now); // Task 6: cookie chờ purpose "enroll", trả { next: "mfa_enroll" }
if (step === "mfa") {
  const pending = await createPendingToken(env.SESSION_SECRET, result.profile.id, "verify", now);
  return json({ next: "mfa", factors: [...factors.map((f) => f.kind), "RECOVERY"], emailMask: maskEmail(factors.find((f) => f.kind === "EMAIL")?.email ?? null) }, 200,
    { "set-cookie": pendingCookie(pending, isSecure(request)) });
}
// step === "session"
if (trustedOk) await touchTrustedStatement(env.DB, trusted!.id, nowIso).run();
const issued = await issueLoginSession(request, env, result.profile, trustedOk ? "PIN_TRUSTED" : "PIN", { trustedDeviceId: trustedOk ? trusted!.id : null, now });
```

  (phần sau như Phần A: `conflict`, `dongBangTin`, `recordLogin`, trả cookie.) Route xác minh:

```ts
route("POST", "/api/auth/mfa/verify", "public", async ({ request, env }) => {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const raw = getCookie(request, PENDING_COOKIE);
  const p = raw ? await verifyPendingToken(env.SESSION_SECRET, raw, now) : null;
  if (!p || p.purpose !== "verify") return error(401, "mfa_expired", "Đã quá 5 phút, đăng nhập lại.");
  const profile = await getActiveStaff(env.DB, p.staffId, p.issuedAt);
  if (!profile) return error(401, "mfa_expired", "Đã quá 5 phút, đăng nhập lại.");
  const blocked = await maintenanceBlock(env.DB, () => profile.permissions);
  if (blocked) return blocked;
  const body = await readJson(request);
  const reservation = await reserveAttempts(env.DB, [{ key: `mfa:${profile.id}`, max: MFA_LIMIT }]);
  if (!reservation.allowed) return tooMany(reservation.retryAfterSeconds); // cùng thân 429 như PIN
  const ok = body?.method === "RECOVERY"
    ? await useRecoveryCode(env.DB, profile.id, String(body?.code ?? ""), nowIso)
    : await useTotp(env, profile.id, String(body?.code ?? ""), now); // giải mã khoá, matchTotp, totp_consume đòi changes = 1
  if (!ok) return error(401, "invalid_code", "Mã không đúng hoặc đã dùng. Kiểm giờ tự động trên điện thoại nếu sai nhiều lần.");
  await clearAttempts(env.DB, `mfa:${profile.id}`, reservation.ids);
  let trustedId: string | null = null;
  const cookies: string[] = [clearedPendingCookie(isSecure(request))];
  if (body?.trustDevice === true) {
    const tok = newTrustedToken();
    trustedId = crypto.randomUUID();
    await insertTrustedStatement(env.DB, { id: trustedId, staffId: profile.id, tokenHash: await sha256Hex(tok), label: sessionDeviceLabel(request.headers.get("user-agent")), at: nowIso, expiresAt: new Date(now + 30 * 86400_000).toISOString() }).run();
    cookies.push(trustedCookie(tok, isSecure(request)));
  }
  const issued = await issueLoginSession(request, env, profile, "PIN_MFA", { trustedDeviceId: trustedId, now });
  if ("conflict" in issued) return issued.conflict;
  // dongBangTin máy cũ + recordLogin như route PIN (dùng chung một hàm nội bộ `finishLogin` để không lặp).
  const res = json({ staff: profile, recoveryLeft: body?.method === "RECOVERY" ? await recoveryLeft(env.DB, profile.id) : undefined }, 200, { "set-cookie": issued.cookie });
  for (const c of cookies) res.headers.append("set-cookie", c);
  return res;
}),
```

  `MFA_LIMIT = 5`. `trustedCookie`: `td_trusted`, `HttpOnly; SameSite=Lax; Path=/api/auth; Max-Age=2592000` (+Secure). Tách phần chung của hai route đăng nhập thành `finishLogin(request, env, ctx, profile, method, opts)` — bài hàng rào "nơi cấp phiên" (Phần A Task 5) cập nhật danh sách cho phép.
  Ghi chú quan trọng: `verifyPinThrottled` xoá bộ đếm `phone:` khi PIN đúng — giữ nguyên; bộ đếm `mfa:` là riêng.
- [ ] **Step 3:** `npm test`, `npm run typecheck`, `npm run test:e2e -- hai-lop passkey maintenance turnstile phien` xanh.
- [ ] **Step 4: Commit** "Cổng hai lớp ở đăng nhập PIN + xác minh mã, máy được tin (ADR-0074 điều 2–3)".

---

### Task 5: Tự bật / gỡ ứng dụng xác thực, mã dự phòng, quên máy

**Files:** Modify `src/modules/auth/index.ts` (route `/api/account/mfa/*`), `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `docs/quyen-hoan.json`; Test `tests/e2e/hai-lop.mjs`, `src/modules/auth/mfa-route.test.ts`

**Interfaces (tất cả access `"staff"`, tự phục vụ — thêm vào `docs/quyen-hoan.json` loại "ngoại lệ", lý do "Tự phục vụ bảo mật đăng nhập của chính mình (ADR-0074); id lấy từ phiên"):**
- `GET /api/account/mfa` → `{ required: boolean; graceUntil: string | null; factors: { kind; createdAt }[]; allowed: ("TOTP"|"EMAIL")[]; recoveryLeft: number; trustedDevices: { id; label; createdAt; lastUsedAt; thisDevice }[] }`
- `POST /api/account/mfa/totp/start` → `{ setupToken, secret, otpauth }` — khoá chưa lưu; `setupToken` = khoá mã hoá + staffId + iat ký HMAC (purpose "totp-setup", 10 phút), để không ghi CSDL trước khi xác nhận.
- `POST /api/account/mfa/totp/confirm` body `{ setupToken, code, currentCode? }` → kiểm mã của khoá mới; nếu đã có yếu tố khác → đòi `currentCode` của yếu tố hiện có (TOTP hiện tại hoặc mã dự phòng); lô: kết thúc TOTP cũ (nếu thay) → chèn TOTP mới (`last_totp_step` = bước vừa khớp) → (nếu là yếu tố đầu tiên) sinh 10 mã dự phòng → nhật ký `mfa_enabled`. Trả `{ recoveryCodes?: string[] }` (chỉ lần đầu).
- `POST /api/account/mfa/recovery/regenerate` body `{ code }` (mã TOTP hiện tại) → thu hồi bộ cũ, trả 10 mã mới; nhật ký `mfa_recovery_regenerated`.
- `POST /api/account/mfa/remove` body `{ kind, code }` → tài khoản nội bộ không gỡ được yếu tố cuối (409 "Tài khoản nội bộ phải giữ ít nhất một cách xác thực."); nhật ký `mfa_removed`.
- `POST /api/account/mfa/trusted/:id/forget`, `POST /api/account/mfa/trusted/forget-all`.
- Nhật ký: `mfa_enabled`, `mfa_removed`, `mfa_recovery_regenerated` (nhãn tiếng Việt), `detail` chỉ là loại yếu tố — không mã, không email.

- [ ] **Step 1: Test đỏ** (e2e): bật TOTP (start → tính mã bằng `fake-totp` → confirm) nhận đúng 10 mã; confirm với mã sai → 401; `PARTNER` bật được; `GET /api/account/mfa` của `admin` có `allowed = ["TOTP"]`; tài khoản nội bộ gỡ yếu tố cuối → 409; mã dự phòng dùng được một lần ở đăng nhập (Task 4 route) và `recoveryLeft` giảm; quên mọi máy → lần sau bị hỏi mã. Bài không-lộ: phản hồi `GET /api/account/mfa` không chứa `secret`/`secret_enc`/mã dự phòng.
- [ ] **Step 2:** Mã. Thiếu `MFA_ENCRYPTION_KEY` → `totp/start` trả 503 "Máy chủ chưa cấu hình khoá bảo mật hai lớp. Báo IT." và một dòng log `mfa_key_missing` (không in khoá).
- [ ] **Step 3:** PASS. **Step 4: Commit** "Tự bật/gỡ ứng dụng xác thực, mã dự phòng, quên máy được tin (ADR-0074 điều 5)".

---

### Task 6: Ân hạn 14 ngày + Quản trị/Toàn quyền tắt lớp hai + cửa sổ 24 giờ

> **Chờ chủ xác nhận** điểm bổ sung sau duyệt (ADR-0074 điều 1). Không bắt đầu khi chưa có câu trả lời.

**Files:** Modify `src/modules/staff/repository.ts`, `src/modules/staff/index.ts` (đặt `mfa_grace_until` trong lô tạo tài khoản và lô đổi quyền), `src/modules/accounts/index.ts` (route mới + nhãn danh sách), `src/modules/auth/index.ts` (`startEnrollStep`, route `/api/auth/mfa/enroll/*`), `src/shared/audit-actions.ts` (`mfa_reset` — thêm vào `SILENT_AUDIT_ACTIONS` cùng loại `pin_reset`), `tests/e2e/lib.mjs` (`datHanAnHan(account, iso)` bằng `sql()`)

**Interfaces / luật hạn ân hạn (một nguồn mỗi trường hợp):**

| Trường hợp | Ai đặt `mfa_grace_until` | Giá trị |
|---|---|---|
| Tài khoản nội bộ có sẵn lúc phát hành | Migration Task 2 | lúc áp + 14 ngày |
| Tạo tài khoản nội bộ (`POST /api/staff`) | Lô tạo tài khoản | lúc tạo + 14 ngày |
| Tài khoản bên ngoài được cấp quyền nội bộ (`PUT /api/staff/:id/permissions`, `PUT /api/staff/:id/roles`) | Lô đổi quyền — chỉ khi **trước** không nội bộ, **sau** nội bộ, **và** chưa có yếu tố sống | lúc đổi + 14 ngày |
| Quản trị/Toàn quyền tắt lớp hai | Lô tắt — đặt `mfa_enroll_until` (không đụng `mfa_grace_until`) | lúc tắt + 24 giờ |
| Được cấp quyền ADMIN/SUPER_ADMIN/ACCOUNTING khi đang có yếu tố EMAIL (Phần C) | Lô đổi quyền: kết thúc yếu tố EMAIL; nếu không còn TOTP → lúc đổi + 14 ngày | — |

- Route `POST /api/staff/:id/mfa-reset` (access `"admin"`): `can(admin.manage)` → `can(account.access.manage)` (Nhân sự bị chặn ở đây) → không tự tắt của mình (409) → `mayManage` → nếu người bị tắt giữ `ADMIN` hoặc `SUPER_ADMIN` thì đòi `can(actor, "admin.manage.superadmin")` (403 "Chỉ Toàn quyền tắt được bảo mật hai lớp của Quản trị/Toàn quyền."). Lô: `factor_end_all` → `recovery_revoke_all` → `trusted_revoke_all('tat_hai_lop')` → `endAllSessionsStatement(…, "tat_hai_lop")` → `touchCredentialsStatement` → đặt `mfa_enroll_until = +24h` → nhật ký `mfa_reset`. Sau lô: `dongBangTin({ staffId, tatThongBao: true })`.
- `startEnrollStep` + route `/api/auth/mfa/enroll/start`, `/api/auth/mfa/enroll/confirm` (public, cookie chờ purpose `enroll`, tự gọi `maintenanceBlock`, hạn mức `mfa:<staffId>`): giống `totp/start|confirm` của Task 5 nhưng xác thực bằng cookie chờ thay cho phiên; confirm thành công → trong cùng lô xoá `mfa_enroll_until` + sinh 10 mã dự phòng → `finishLogin(…, "PIN_MFA")`. Trang đăng nhập hiện bước "Bật bảo mật hai lớp".
- Danh sách Quản lý tài khoản: thêm `mfa: { enabled: boolean; graceUntil: string | null }` và cờ `canResetMfa` tính ở máy chủ theo luật trên (giao diện không tự suy từ mã quyền — `src/giao-dien-hoi-bang-quyen.test.ts`).

- [ ] **Step 1: Test đỏ** (e2e): Quản trị tắt cho `salesA` → 200, phiên `salesA` kết thúc `tat_hai_lop`, nhật ký `mfa_reset` (Quản trị xem nhật ký không thấy nếu người làm là Toàn quyền); Quản trị tắt cho tài khoản `ADMIN` khác → 403; Toàn quyền → 200; Nhân sự → 403; tự tắt → 409; `salesA` đăng nhập PIN trong 24 giờ → `next: "mfa_enroll"` → bật xong có phiên; `datHanAnHan(salesB, quá khứ)` + chưa bật → 403 `mfa_setup_required`; tạo tài khoản nội bộ mới → `mfa_grace_until` ≈ +14 ngày; `PARTNER` mới → NULL.
- [ ] **Step 2:** Mã. **Step 3:** PASS. **Step 4: Commit** "Ân hạn 14 ngày, Quản trị/Toàn quyền tắt bảo mật hai lớp, cửa sổ bật lại 24 giờ (ADR-0074 điều 1, 5)".

---

### Task 7: Giao diện

**Files:** `web/login.ts`, `web/account.ts`, `web/staff.ts`, `web/shell.ts`, `web/vendor/qrcode.js` (tạo), `src/shared/huong-dan*.ts` (Trợ giúp), `public/app.css` (chỉ token có sẵn; nếu cần giá trị mới thì thêm token)

- **QR (ruling bề mặt, đảo ngược được):** chép nguyên tệp `qrcode.js` của thư viện **qrcode-generator** (Kazuhiko Arase, giấy phép MIT) vào `web/vendor/qrcode.js`, giữ dòng giấy phép ở đầu; **đọc hết tệp trước khi chép** (không có gọi mạng, không `eval`); không thêm vào `package.json` (không phải dependency npm). Dựng QR thành `<canvas>` hoặc SVG bằng `createElementNS` — không `innerHTML`. Nếu người kiểm/chủ phản đối mã chép ngoài, phương án thay: chỉ hiện liên kết `otpauth://` + khoá dạng chữ (đủ cho iPhone; máy tính gõ tay khoá).
- **Đăng nhập bước 2:** sau PIN, nếu `next === "mfa"`: thay form bằng "Nhập mã xác thực" — ô 6 số (`inputmode="numeric"`, `autocomplete="one-time-code"`, 16px), ô chọn "Tin máy này 30 ngày" (mặc định bật), liên kết "Dùng mã dự phòng" (đổi ô sang 9 ký tự `xxxx-xxxx`), nút "Quay lại". `next === "mfa_enroll"`: bước bật như trang Tài khoản. Lỗi 403 `mfa_setup_required`: hiện nguyên câu máy chủ.
- **Tài khoản của tôi → Bảo mật đăng nhập:** trạng thái; nút "Bật ứng dụng xác thực" → hiện QR (máy tính) + nút **"Mở ứng dụng xác thực"** (`<a href="otpauth://…">`) + "Chép khoá" + ô nhập mã xác nhận; sau bật hiện 10 mã dự phòng một lần (nút Chép, nút Tải `.txt` qua `Blob`), chữ đỏ "Cất các mã này ở nơi an toàn — mỗi mã dùng một lần."; số mã dự phòng còn lại + "Tạo bộ mới"; danh sách máy được tin + "Quên máy này"/"Quên mọi máy".
- **Dải nhắc ân hạn** (`web/shell.ts`): `GET /api/auth/me` thêm `mfa: { required, graceUntil, enabled }`; còn hạn và chưa bật → dải "Còn N ngày để bật bảo mật hai lớp — Bật ngay" dẫn tới trang Tài khoản.
- **Quản lý tài khoản:** nhãn "Hai lớp: Đã bật / Chưa bật (hạn dd/mm)"; nút "Tắt bảo mật hai lớp" chỉ khi `canResetMfa`, hộp xác nhận trong trang.
- **Trợ giúp:** mục "Bật bảo mật hai lớp" (cài Google Authenticator từ App Store/CH Play, bấm "Mở ứng dụng xác thực", cất mã dự phòng, mất máy thì làm gì).

- [ ] **Step 1:** Làm giao diện; `npm run build:web`; `npm run typecheck`; `node --test src/giao-dien-hoi-bang-quyen.test.ts`.
- [ ] **Step 2:** Kịch bản Chrome `docs/evidence/2026-10-01-dang-nhap-b/kich-ban/hai-lop.mjs`: bật TOTP (tính mã bằng `fake-totp`), đăng xuất, đăng nhập 2 bước, đăng nhập bằng mã dự phòng, Quản trị tắt lớp hai. Ảnh vào `docs/evidence/2026-10-01-dang-nhap-b/`.
- [ ] **Step 3 (người — ghi vào sổ, không tự khai):** thử trên iPhone thật ở bản chạy thử LAN (`node scripts/dev-iphone.mjs`): nút "Mở ứng dụng xác thực" mở Google Authenticator và thêm tài khoản; mã nhập vào được. Chưa thử được thì ghi "chưa kiểm trên iPhone thật".
- [ ] **Step 4: Commit** "Giao diện bảo mật hai lớp: bước nhập mã, bật ứng dụng xác thực, mã dự phòng, nhắc ân hạn".

---

### Task 8: Bất biến, hàng rào, tài liệu, kiểm độc lập

- [ ] **Step 1:** `scripts/audit-invariants.mjs`: `R-AUT-MFA-1` — tài khoản nội bộ đang hoạt động phải có yếu tố sống **hoặc** `mfa_grace_until`/`mfa_enroll_until` khác NULL; `R-AUT-MFA-2` — không quá một yếu tố sống mỗi loại mỗi người; `R-AUT-MFA-3` — không máy được tin còn sống của tài khoản đã ngưng.
- [ ] **Step 2:** Bài hàng rào "không nơi nào cấp phiên mới ngoài `issueLoginSession`" (Phần A) cập nhật cho `finishLogin`; **quan sát chặn thật**: thêm tạm một `issueLoginSession` vào route lạ → đỏ → hoàn nguyên. Dòng `docs/SO-HANG-RAO.md`: cổng lớp hai, cookie chờ ≠ phiên (bài Task 3), hạn mức theo tài khoản (e2e Task 4), ngày quan sát.
- [ ] **Step 3:** Tài liệu mô tả (`docs/SYSTEM-DESIGN.md` §4, §5, §7, §8; `docs/CHANGE-GUIDE.md` công thức "thêm yếu tố xác thực" + bẫy `MFA_ENCRYPTION_KEY`), nhật ký phiên bản ("Nhân viên bật bảo mật hai lớp bằng Google Authenticator; có 14 ngày để bật.").
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` xanh, dán số vào sổ.
- [ ] **Step 5:** Giao **người kiểm độc lập** (`nguoi-kiem-doc-lap`, chỉ đọc) như Phần A.

**Việc của chủ khi phát hành (đưa nguyên lệnh, chủ tự chạy):** đặt bí mật **trước** khi triển khai bản có Phần B, đứng ở thư mục `tourdao-sales`:

```
openssl rand -base64 32
```

```
npx wrangler secret put MFA_ENCRYPTION_KEY
```

(dán chuỗi vừa sinh khi được hỏi; cất chuỗi này ở nơi an toàn — mất khoá thì mọi người phải bật lại ứng dụng xác thực.)
