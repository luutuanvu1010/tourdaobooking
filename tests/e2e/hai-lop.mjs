// E2E bảo mật hai lớp ở đăng nhập PIN (ADR-0074 điều 2–3; kế hoạch Phần B Task 4) trên wrangler dev thật. Bài cùng ý chạy không mạng: src/modules/auth/hai-lop-dang-nhap.test.ts.
// Dùng tài khoản Bán hàng DÙNG MỘT LẦN (SĐT ngẫu nhiên, gieo bằng insertStaffSql) — KHÔNG dùng salesA: yếu tố TOTP sống trên tài khoản dùng chung làm mọi `session()`
// của kịch bản sau (cùng D1 tạm) bị hỏi mã. Yếu tố TOTP gieo thẳng bằng SQL (route tự bật là Task 5) với khoá mã hoá do run.mjs truyền (E2E_MFA_KEY).
// Tự bật chế độ bảo trì ở ca 8 và KHÔI PHỤC ở `finally`. Ca 429 chạy CUỐI (khoá mfa:<id> 15 phút).
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";
import { createFakeAuthenticator } from "./fake-authenticator.mjs";
import { base32Encode, maHoaKhoa, totp } from "./fake-totp.mjs";
import { ACCOUNTS, BASE, TURNSTILE_TEST, call, datHanAnHan, freshIp, gieoTaiKhoanLai, randomPhone, session, sql, sqlRows } from "./lib.mjs";

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

// ===================== Task 5 (ADR-0074 điều 5): TỰ bật / đổi / gỡ ứng dụng xác thực, mã dự phòng, quên máy được tin — route /api/account/mfa*.
// Tài khoản DÙNG MỘT LẦN (khoá mfa:<AID> của A đã bị 429 ở trên). Mỗi bước TOTP tiêu một bước 30 giây: chờ khỏi mốc chuyển bước rồi dùng s−1, s, s+1 theo thứ tự.
const ngu = (ms) => new Promise((res) => setTimeout(res, ms));
async function buocAnToan() {
  const du = Date.now() % 30_000;
  if (du > 25_000) await ngu(30_000 - du + 100);
  return Math.floor(Date.now() / 30_000);
}
const maBuoc = (b32, buoc) => totp(b32, buoc * 30_000);
const MA_DP_RE = /^[23456789abcdefghjkmnpqrstuvwxyz]{4}-[23456789abcdefghjkmnpqrstuvwxyz]{4}$/;

const B = await gieoTaiKhoanLai("Hai Lớp Tự Bật", ["SALES"]);
r = await call(B.cookie, "GET", "/api/account/mfa");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.required, true);
assert.ok(Date.parse(r.body.graceUntil) > Date.now() + 13 * 86_400_000, "nội bộ mới tạo: ân hạn 14 ngày");
assert.deepEqual([r.body.factors, r.body.allowed, r.body.recoveryLeft, r.body.trustedDevices], [[], ["TOTP", "EMAIL"], 0, []]);
r = await call(B.cookie, "POST", "/api/account/mfa/totp/start", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
const KHOA_B = r.body.secret;
const PHIEU_B = r.body.setupToken;
assert.match(KHOA_B, /^[A-Z2-7]{32}$/);
assert.ok(r.body.otpauth.startsWith("otpauth://totp/") && r.body.otpauth.includes(`secret=${KHOA_B}`) && !r.body.otpauth.includes(B.phone), "otpauth có khoá, không SĐT");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = '${B.id}'`))[0].n, 0, "bắt đầu bật chưa ghi CSDL");
r = await call(B.cookie, "POST", "/api/account/mfa/totp/confirm", { setupToken: PHIEU_B, code: "000000" });
assert.equal(r.status, 401, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_code");
let sB = await buocAnToan();
r = await call(B.cookie, "POST", "/api/account/mfa/totp/confirm", { setupToken: PHIEU_B, code: maBuoc(KHOA_B, sB - 1) });
assert.equal(r.status, 200, JSON.stringify(r.body));
const MA_B = r.body.recoveryCodes;
assert.equal(MA_B.length, 10);
for (const m of MA_B) assert.match(m, MA_DP_RE);
console.log("✓ T5. bật ứng dụng xác thực: mã sai → 401; mã đúng → 10 mã dự phòng (một lần)");

r = await call(B.cookie, "GET", "/api/account/mfa");
assert.equal(r.status, 200);
assert.equal(r.body.required, false);
assert.deepEqual(r.body.factors.map((f) => f.kind), ["TOTP"]);
assert.equal(r.body.recoveryLeft, 10);
const thanGet = JSON.stringify(r.body);
assert.doesNotMatch(thanGet, /secret|code_hash|token_hash/i, "GET không có khoá / băm");
for (const d of [KHOA_B, ...MA_B]) assert.ok(!thanGet.includes(d), `GET chứa "${d}"`);
assert.deepEqual(await sqlRows(`SELECT action, detail FROM audit_log WHERE staff_id = '${B.id}' AND action LIKE 'mfa_%'`), [{ action: "mfa_enabled", detail: "TOTP" }]);
console.log("✓ T5. GET /api/account/mfa: đã bật, 10 mã còn lại, không lộ khoá / mã; nhật ký mfa_enabled chỉ ghi loại");

r = await call(B.cookie, "POST", "/api/account/mfa/remove", { kind: "TOTP", code: MA_B[9] });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual(r.body.error, { code: "mfa_last_factor", message: "Tài khoản nội bộ phải giữ ít nhất một cách xác thực." });
console.log("✓ T5. tài khoản nội bộ gỡ yếu tố cuối → 409");

// Mã dự phòng ở đăng nhập (route bước hai của Task 4): dùng một lần, recoveryLeft giảm; tin máy này.
r = await verify(await pendingOf(B), { method: "RECOVERY", code: MA_B[0], trustDevice: true });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryLeft, 9);
let SB = cookieOf(r, "td_session");
const TIN_B = cookieOf(r, "td_trusted");
assert.ok(SB && TIN_B);
assert.equal((await verify(await pendingOf(B), { method: "RECOVERY", code: MA_B[0], trustDevice: false })).status, 401, "mã dự phòng chỉ dùng một lần");
r = await call(SB, "GET", "/api/account/mfa");
assert.equal(r.body.recoveryLeft, 9);
assert.equal(r.body.trustedDevices.length, 1);
assert.equal(r.body.trustedDevices[0].thisDevice, true);
console.log("✓ T5. mã dự phòng dùng được một lần ở đăng nhập, recoveryLeft giảm; máy tin hiện trong danh sách (máy này)");

// Đổi khoá: cần mã hiện tại (dùng mã dự phòng — tránh tiêu thêm bước TOTP), không sinh bộ mã mới.
r = await call(SB, "POST", "/api/account/mfa/totp/start", {});
const KHOA_B2 = r.body.secret;
sB = await buocAnToan();
const r2 = await call(SB, "POST", "/api/account/mfa/totp/confirm", { setupToken: r.body.setupToken, code: maBuoc(KHOA_B2, sB) });
assert.equal(r2.status, 400, JSON.stringify(r2.body));
assert.equal(r2.body.error.code, "current_code_required");
r = await call(SB, "POST", "/api/account/mfa/totp/confirm", { setupToken: r.body.setupToken, code: maBuoc(KHOA_B2, sB), currentCode: MA_B[1] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, {});
// Tạo bộ mã mới bằng mã TOTP của khoá MỚI (bước sau bước vừa dùng lúc đổi).
r = await call(SB, "POST", "/api/account/mfa/recovery/regenerate", { code: maBuoc(KHOA_B2, sB + 1) });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryCodes.length, 10);
assert.equal((await verify(await pendingOf(B), { method: "RECOVERY", code: MA_B[2], trustDevice: false })).status, 401, "bộ mã cũ hết hiệu lực");
console.log("✓ T5. đổi khoá cần mã hiện tại; tạo bộ mã dự phòng mới — bộ cũ hết hiệu lực");

// Quên mọi máy → lần đăng nhập PIN sau trên máy đó bị hỏi mã.
r = await pinLogin(B, TIN_B);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff?.phone, B.phone, "trước khi quên: máy tin vào thẳng");
SB = cookieOf(r, "td_session");
r = await call(SB, "POST", "/api/account/mfa/trusted/forget-all", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.revoked, 1);
r = await pinLogin(B, TIN_B);
assert.equal(r.body.next, "mfa", JSON.stringify(r.body));
console.log("✓ T5. quên mọi máy → lần sau bị hỏi mã");

r = await call(await session(ACCOUNTS.admin), "GET", "/api/account/mfa");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.allowed, ["TOTP"]);
console.log("✓ T5. Quản trị: chỉ được bật ứng dụng xác thực (allowed = TOTP)");

// Đối tác (bên ngoài): không bắt buộc, tự bật được; gỡ được yếu tố cuối → đăng nhập lại như cũ.
const P = await gieoTaiKhoanLai("Đối Tác Hai Lớp", ["PARTNER"]);
r = await call(P.cookie, "GET", "/api/account/mfa");
assert.equal(r.body.required, false);
assert.equal(r.body.graceUntil, null);
r = await call(P.cookie, "POST", "/api/account/mfa/totp/start", {});
const KHOA_P = r.body.secret;
r = await call(P.cookie, "POST", "/api/account/mfa/totp/confirm", { setupToken: r.body.setupToken, code: maBuoc(KHOA_P, await buocAnToan()) });
assert.equal(r.status, 200, JSON.stringify(r.body));
const MA_P = r.body.recoveryCodes;
assert.equal(MA_P.length, 10);
r = await pinLogin(P);
assert.equal(r.body.next, "mfa", JSON.stringify(r.body));
r = await call(P.cookie, "POST", "/api/account/mfa/remove", { kind: "TOTP", code: MA_P[0] });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await pinLogin(P);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff?.phone, P.phone, "gỡ hết → Đối tác đăng nhập PIN như cũ");
console.log("✓ T5. Đối tác tự bật được (bị hỏi mã), gỡ được yếu tố cuối");

// Không lộ ở nhật ký: khoá, mã dự phòng của phần Task 5.
const nhatKy5 = JSON.stringify(await sqlRows(`SELECT * FROM audit_log WHERE staff_id IN ('${B.id}', '${P.id}')`));
for (const d of [KHOA_B, KHOA_B2, KHOA_P, ...MA_B, ...MA_P]) assert.ok(!nhatKy5.includes(d), `nhật ký chứa "${d}"`);
console.log("✓ T5. nhật ký không chứa khoá / mã dự phòng");

// ===================== Task 6 (ADR-0074 điều 1, 5): Quản trị/Toàn quyền tắt lớp hai → cửa sổ 24 giờ bật lại ở bước đăng nhập; ân hạn 14 ngày.
// Tài khoản DÙNG MỘT LẦN (gieoTaiKhoanLai) — KHÔNG dùng salesA/salesB như bản nháp kế hoạch: tắt lớp hai mở cửa sổ bật BẮT BUỘC, bật xong thì tài khoản có yếu tố
// TOTP ⇒ mọi `session(salesA)` của kịch bản khác (cùng D1 tạm) bị hỏi mã.
const QT = await session(ACCOUNTS.admin);
const TQ = await session(ACCOUNTS.superAdmin);
const NS = await session(ACCOUNTS.hr);
const [{ id: QT_ID }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.admin.phone}'`);
const [{ id: TQ_ID }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.superAdmin.phone}'`);
const tat = (cookie, id) => call(cookie, "POST", `/api/staff/${id}/mfa-reset`, {});

const C = await gieoTaiKhoanLai("Hai Lớp Bị Tắt", ["SALES"]);
r = await call(C.cookie, "POST", "/api/account/mfa/totp/start", {});
r = await call(C.cookie, "POST", "/api/account/mfa/totp/confirm", { setupToken: r.body.setupToken, code: maBuoc(r.body.secret, await buocAnToan()) });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await tat(QT, C.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await call(C.cookie, "GET", "/api/auth/me")).status, 401, "phiên cũ của người bị tắt hết hiệu lực");
assert.deepEqual(await sqlRows(`SELECT DISTINCT end_reason FROM aut_session WHERE staff_id = '${C.id}'`), [{ end_reason: "tat_hai_lop" }]);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = '${C.id}' AND valid_to_at IS NULL`))[0].n, 0);
assert.deepEqual(await sqlRows(`SELECT staff_id, detail FROM audit_log WHERE action = 'mfa_reset' AND target_id = '${C.id}'`), [{ staff_id: QT_ID, detail: null }]);
console.log("✓ T6. Quản trị tắt lớp hai của Bán hàng → 200; phiên kết thúc 'tat_hai_lop'; yếu tố hết; nhật ký mfa_reset không chi tiết");

const QT2 = await gieoTaiKhoanLai("Quản Trị Hai Lớp", ["ADMIN"]);
assert.equal((await tat(QT, QT2.id)).status, 403, "Quản trị không tắt của Quản trị khác");
assert.equal((await tat(NS, C.id)).status, 403, "Nhân sự không làm hỗ trợ đăng nhập (ADR-0071 đ1e)");
assert.equal((await tat(TQ, TQ_ID)).status, 409, "không tự tắt của chính mình");
assert.equal((await tat(QT, QT_ID)).status, 409, "Quản trị tự tắt của mình → 409");
assert.equal((await tat(TQ, QT2.id)).status, 200, "Toàn quyền tắt của Quản trị");
console.log("✓ T6. Quản trị → Quản trị khác 403; Nhân sự 403; tự tắt 409; Toàn quyền → Quản trị 200");

r = await pinLogin(C);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { next: "mfa_enroll" });
assert.equal(cookieOf(r, "td_session"), null);
const CHO_C = cookieOf(r, "td_mfa_pending");
r = await call(CHO_C, "POST", "/api/auth/mfa/enroll/start", {});
assert.equal(r.status, 200, JSON.stringify(r.body));
const PHIEU_C = r.body.setupToken;
const KHOA_C = r.body.secret;
r = await call(CHO_C, "POST", "/api/auth/mfa/enroll/confirm", { setupToken: PHIEU_C, code: "000000" });
assert.equal(r.status, 401, JSON.stringify(r.body));
r = await call(CHO_C, "POST", "/api/auth/mfa/enroll/confirm", { setupToken: PHIEU_C, code: maBuoc(KHOA_C, await buocAnToan()) });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryCodes.length, 10);
const SC = cookieOf(r, "td_session");
assert.ok(SC);
assert.equal((await call(SC, "GET", "/api/auth/me")).status, 200);
assert.deepEqual(await sqlRows(`SELECT method FROM aut_session WHERE staff_id = '${C.id}' AND ended_at IS NULL`), [{ method: "PIN_MFA" }]);
assert.deepEqual(await sqlRows(`SELECT mfa_enroll_until FROM staff WHERE id = '${C.id}'`), [{ mfa_enroll_until: null }]);
console.log("✓ T6. trong 24 giờ: PIN → next=mfa_enroll; bật xong (mã sai 401, mã đúng 200) → có phiên PIN_MFA + 10 mã dự phòng; cửa sổ đóng");

const D = await gieoTaiKhoanLai("Hết Ân Hạn", ["SALES"]);
await datHanAnHan(D, "2020-01-01T00:00:00.000Z");
r = await pinLogin(D);
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.code, "mfa_setup_required");
console.log("✓ T6. hết ân hạn mà chưa bật → 403 mfa_setup_required");

const taoMoi = async (permissions) => {
  const phone = randomPhone();
  const t = await call(TQ, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tạo Mới Hai Lớp", phone, permissions });
  assert.equal(t.status, 201, JSON.stringify(t.body));
  return (await sqlRows(`SELECT mfa_grace_until FROM staff WHERE phone = '${phone}'`))[0].mfa_grace_until;
};
const hanMoi = await taoMoi(["SALES"]);
assert.ok(Math.abs(Date.parse(hanMoi) - (Date.now() + 14 * 86_400_000)) < 120_000, `nội bộ mới: ân hạn ≈ +14 ngày (${hanMoi})`);
assert.equal(await taoMoi(["PARTNER"]), null, "Đối tác mới: không ân hạn (không bắt buộc)");
console.log("✓ T6. tạo tài khoản nội bộ mới → ân hạn ≈ 14 ngày; Đối tác mới → NULL");

const E = await gieoTaiKhoanLai("Đối Tác Thành Nội Bộ", ["PARTNER"]);
r = await call(TQ, "PUT", `/api/staff/${E.id}/permissions`, { permissions: ["SALES"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
const hanE = (await sqlRows(`SELECT mfa_grace_until FROM staff WHERE id = '${E.id}'`))[0].mfa_grace_until;
assert.ok(Math.abs(Date.parse(hanE) - (Date.now() + 14 * 86_400_000)) < 120_000, `bên ngoài → nội bộ: ân hạn ≈ +14 ngày (${hanE})`);
assert.equal((await pinLogin(E)).status, 200, "trong ân hạn vào được");
console.log("✓ T6. Đối tác được cấp quyền nội bộ → ân hạn 14 ngày từ lúc cấp");

console.log("E2E HAI LỚP OK");
