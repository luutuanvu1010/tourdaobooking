// E2E bảo mật hai lớp ở đăng nhập PIN (ADR-0074 điều 2–3; kế hoạch Phần B Task 4) trên wrangler dev thật. Bài cùng ý chạy không mạng: src/modules/auth/hai-lop-dang-nhap.test.ts.
// Dùng tài khoản Bán hàng DÙNG MỘT LẦN (SĐT ngẫu nhiên, gieo bằng insertStaffSql) — KHÔNG dùng salesA: yếu tố TOTP sống trên tài khoản dùng chung làm mọi `session()`
// của kịch bản sau (cùng D1 tạm) bị hỏi mã. Yếu tố TOTP gieo thẳng bằng SQL (route tự bật là Task 5) với khoá mã hoá do run.mjs truyền (E2E_MFA_KEY).
// Tự bật chế độ bảo trì ở ca 8 và KHÔI PHỤC ở `finally`. Ca 429 chạy CUỐI (khoá mfa:<id> 15 phút).
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";
import { createFakeAuthenticator } from "./fake-authenticator.mjs";
import { base32Encode, maHoaKhoa, totp } from "./fake-totp.mjs";
import { ACCOUNTS, BASE, TURNSTILE_TEST, call, freshIp, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const KHOA = process.env.E2E_MFA_KEY;
if (!KHOA) throw new Error("Thiếu E2E_MFA_KEY (run.mjs truyền cùng giá trị --var MFA_ENCRYPTION_KEY cho wrangler dev)");

const cookieOf = (r, name) => {
  const c = r.headers.getSetCookie().find((x) => x.startsWith(`${name}=`) && !x.startsWith(`${name}=;`));
  return c ? c.split(";")[0] : null;
};
const jar = (...parts) => parts.filter(Boolean).join("; ");
const pinLogin = (acc, cookie = null) => call(cookie, "POST", "/api/auth/login", { phone: acc.phone, pin: acc.pin, turnstileToken: TURNSTILE_TEST.dummyToken }, freshIp());
const verify = (pending, body, cookie = null) => call(jar(pending, cookie), "POST", "/api/auth/mfa/verify", body, freshIp());
async function pendingOf(acc) {
  const r = await pinLogin(acc);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.next, "mfa", JSON.stringify(r.body));
  return cookieOf(r, "td_mfa_pending");
}

// ---- Chuẩn bị: tài khoản dùng một lần + yếu tố TOTP + 2 mã dự phòng
const A = { name: "Hai Lớp Thử", phone: randomPhone(), pin: String(200000 + Math.floor(Math.random() * 700000)) };
await sql((await insertStaffSql({ ...A, permissions: ["SALES"] })).replace(/\n/g, " "));
const [{ id: AID }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${A.phone}'`);
const BI_MAT = randomBytes(20);
const B32 = base32Encode(BI_MAT);
const at = new Date().toISOString();
const MA_DU_PHONG = ["k7m2-p9qr", "x3v8-w4ab"];
const bam = (m) => createHash("sha256").update(`${AID}:${m.replace("-", "")}`).digest("hex");
await sql(
  `INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) ` +
    `VALUES ('${randomBytes(8).toString("hex")}', '${AID}', 'TOTP', '${maHoaKhoa(KHOA, BI_MAT)}', NULL, 0, '${at}', NULL, '${at}', '${AID}', '${at}', '${AID}'); ` +
    MA_DU_PHONG.map((m, i) =>
      `INSERT INTO aut_mfa_recovery_code (id, staff_id, batch_id, code_hash, created_at, created_by, updated_at, updated_by, used_at, revoked_at) VALUES ('${AID}-r${i}', '${AID}', 'b1', '${bam(m)}', '${at}', '${AID}', '${at}', '${AID}', NULL, NULL);`,
    ).join(" "),
);
const phienMoiNhat = async () => (await sqlRows(`SELECT method FROM aut_session WHERE staff_id = '${AID}' ORDER BY created_at DESC LIMIT 1`))[0]?.method;

// 1. PIN đúng → next=mfa, KHÔNG có td_session, có cookie chờ
let r = await pinLogin(A);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
assert.equal(cookieOf(r, "td_session"), null);
const P1 = cookieOf(r, "td_mfa_pending");
assert.ok(P1);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_session WHERE staff_id = '${AID}'`))[0].n, 0);
console.log("✓ 1. PIN đúng → next=mfa + cookie chờ, chưa có phiên");

// 5. Cookie chờ không mở được /api/auth/me
assert.equal((await call(P1, "GET", "/api/auth/me")).status, 401);
assert.equal((await call(P1.replace("td_mfa_pending=", "td_session="), "GET", "/api/auth/me")).status, 401);
console.log("✓ 5. cookie chờ gửi tới /api/auth/me → 401");

// 2. Mã đúng → 200 + td_session (PIN_MFA)
const now = Date.now();
const MA_DA_DUNG = totp(B32, now);
r = await verify(P1, { method: "TOTP", code: MA_DA_DUNG, trustDevice: false });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, A.phone);
const S1 = cookieOf(r, "td_session");
assert.ok(S1);
assert.equal(cookieOf(r, "td_trusted"), null);
assert.equal((await call(S1, "GET", "/api/auth/me")).status, 200);
assert.equal(await phienMoiNhat(), "PIN_MFA");
console.log("✓ 2. mã đúng → 200 + td_session, sổ phiên PIN_MFA");

// 3. Dùng lại đúng mã đó ở lần đăng nhập mới → 401
r = await verify(await pendingOf(A), { method: "TOTP", code: MA_DA_DUNG, trustDevice: false });
assert.equal(r.status, 401, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_code");
assert.equal(cookieOf(r, "td_session"), null);
console.log("✓ 3. dùng lại mã vừa dùng → 401 invalid_code");

// 7. Tin máy này → td_trusted; lần PIN sau mang td_trusted → { staff } ngay, PIN_TRUSTED
r = await verify(await pendingOf(A), { method: "TOTP", code: totp(B32, now + 30_000), trustDevice: true });
assert.equal(r.status, 200, JSON.stringify(r.body));
const TIN = cookieOf(r, "td_trusted");
assert.ok(TIN, "phải có td_trusted");
const tinSetCookie = r.headers.getSetCookie().find((x) => x.startsWith("td_trusted="));
assert.match(tinSetCookie, /Path=\/api\/auth; Max-Age=2592000; HttpOnly; SameSite=Lax/);
r = await pinLogin(A, TIN);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff?.phone, A.phone, JSON.stringify(r.body));
let S = cookieOf(r, "td_session");
assert.ok(S);
assert.equal(await phienMoiNhat(), "PIN_TRUSTED");
const [may] = await sqlRows(`SELECT token_hash FROM aut_trusted_device WHERE staff_id = '${AID}'`);
assert.notEqual(may.token_hash, TIN.slice("td_trusted=".length), "CSDL chỉ giữ băm");
console.log("✓ 7. tin máy 30 ngày → lần sau đăng nhập PIN không hỏi mã, sổ phiên PIN_TRUSTED");

// Mã dự phòng: dùng một lần, recoveryLeft giảm
r = await verify(await pendingOf(A), { method: "RECOVERY", code: MA_DU_PHONG[0].toUpperCase(), trustDevice: false });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryLeft, 1);
S = cookieOf(r, "td_session");
assert.equal((await verify(await pendingOf(A), { method: "RECOVERY", code: MA_DU_PHONG[0], trustDevice: false })).status, 401);
console.log("✓ mã dự phòng dùng được một lần, recoveryLeft giảm");

// 6. Face ID không bị hỏi lớp hai
const RP = { rpId: new URL(BASE).hostname, origin: new URL(BASE).origin };
const auth = await createFakeAuthenticator(RP);
r = await call(S, "POST", "/api/account/passkeys/options", { pin: A.pin });
assert.equal(r.status, 200, JSON.stringify(r.body));
const cred = await auth.register(r.body.publicKey.challenge, { userHandle: r.body.publicKey.user.id });
r = await call(jar(S, cookieOf(r, "td_webauthn")), "POST", "/api/account/passkeys", { credential: cred });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(null, "POST", "/api/auth/passkey/options", {}, freshIp());
const sig = await auth.sign(r.body.publicKey.challenge);
r = await call(cookieOf(r, "td_webauthn"), "POST", "/api/auth/passkey/login", { credential: sig }, freshIp());
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, A.phone);
assert.ok(cookieOf(r, "td_session"));
assert.equal(await phienMoiNhat(), "PASSKEY");
console.log("✓ 6. đăng nhập Face ID → phiên ngay, không qua bước hai");

// 8. Bảo trì bật → /api/auth/mfa/verify của tài khoản không phải Toàn quyền → 503 (cookie chờ lấy TRƯỚC khi bật — lúc bật, đăng nhập PIN đã bị chặn)
const OWNER = await session(ACCOUNTS.superAdmin);
const P8 = await pendingOf(A);
try {
  r = await call(OWNER, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await verify(P8, { method: "TOTP", code: totp(B32, Date.now() + 30_000), trustDevice: false });
  assert.equal(r.status, 503, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "maintenance");
  assert.equal(cookieOf(r, "td_session"), null);
} finally {
  await sql("UPDATE mnt_setting SET enabled = 0, ends_at = NULL WHERE id = 'default'");
}
assert.equal((await sqlRows("SELECT enabled FROM mnt_setting WHERE id = 'default'"))[0].enabled, 0);
console.log("✓ 8. bảo trì bật → bước hai trả 503 maintenance");

// 4. 5 mã sai, mỗi lần đăng nhập PIN lại để có cookie chờ MỚI → lần 6: 429 (hạn mức theo tài khoản, không theo cookie chờ).
// Bộ đếm đang giữ 1 lần sai (mã dự phòng dùng lại ở trên) — bằng chứng đếm theo TÀI KHOẢN qua nhiều cookie chờ; mã đúng (mã dự phòng thứ hai) xoá bộ đếm về 0.
assert.equal((await sqlRows(`SELECT count(*) AS n FROM login_attempt WHERE key = 'mfa:${AID}'`))[0].n, 1);
r = await verify(await pendingOf(A), { method: "RECOVERY", code: MA_DU_PHONG[1], trustDevice: false });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryLeft, 0);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM login_attempt WHERE key = 'mfa:${AID}'`))[0].n, 0, "mã đúng xoá bộ đếm");
for (let i = 1; i <= 5; i++) {
  r = await verify(await pendingOf(A), { method: "TOTP", code: "000000", trustDevice: false });
  assert.equal(r.status, 401, `lần ${i}: ${JSON.stringify(r.body)}`);
}
r = await verify(await pendingOf(A), { method: "TOTP", code: totp(B32, Date.now() + 30_000), trustDevice: false });
assert.equal(r.status, 429, JSON.stringify(r.body));
assert.equal(r.body.error.code, "too_many_attempts");
assert.ok(Number(r.headers.get("retry-after")) > 0);
console.log("✓ 4. 5 mã sai với 5 cookie chờ khác nhau → lần 6: 429");

// Không lộ: nhật ký không chứa khoá / mã / mã dự phòng / token máy tin
const nhatKy = JSON.stringify(await sqlRows("SELECT * FROM audit_log"));
for (const d of [B32, MA_DA_DUNG, ...MA_DU_PHONG, TIN.slice("td_trusted=".length)]) assert.ok(!nhatKy.includes(d), `nhật ký chứa "${d}"`);
console.log("✓ nhật ký không chứa khoá, mã, mã dự phòng, token máy tin");

console.log("E2E HAI LỚP OK");
