// E2E đăng nhập bằng Face ID (passkey, ADR-0016; đặc tả 2026-09-23-passkey-design.md §4). Authenticator GIẢ (tests/e2e/fake-authenticator.mjs) ký thật bằng Web Crypto.
// Đổi PIN của salesB, tạm ngưng rồi kích hoạt lại field — CHẠY CUỐI CÙNG (run.mjs: ALL), mọi kịch bản của một lần chạy dùng chung một D1 tạm.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, freshIp, login, session, sql, sqlRows } from "./lib.mjs";
import { createFakeAuthenticator } from "./fake-authenticator.mjs";

const RP = { rpId: new URL(BASE).hostname, origin: new URL(BASE).origin };
const cookieJar = (...parts) => parts.filter(Boolean).join("; ");
/** Lấy cookie tên `name` từ mọi Set-Cookie của phản hồi (D-3: một hàm dùng chung thay cho challengeCookie()/sessionCookie() riêng). */
const cookieOf = (r, name) => {
  const all = r.headers.getSetCookie?.() ?? [r.headers.get("set-cookie") ?? ""];
  const c = all.find((x) => x.startsWith(`${name}=`) && !x.startsWith(`${name}=;`));
  return c ? c.split(";")[0] : null;
};
const challengeCookie = (r) => cookieOf(r, "td_webauthn");
const sessionCookie = (r) => cookieOf(r, "td_session");

async function enable(cookie, pin, auth, o = {}) {
  const opt = await call(cookie, "POST", "/api/account/passkeys/options", { pin });
  if (opt.status !== 200) return opt;
  const cred = await auth.register(opt.body.publicKey.challenge, { userHandle: opt.body.publicKey.user.id, ...o });
  return call(cookieJar(cookie, challengeCookie(opt)), "POST", "/api/account/passkeys", { credential: cred });
}
async function passkeyLogin(auth, o = {}) {
  const opt = await call(null, "POST", "/api/auth/passkey/options", {}, freshIp());
  assert.equal(opt.status, 200, JSON.stringify(opt.body));
  const cred = await auth.sign(opt.body.publicKey.challenge, o);
  const r = await call(challengeCookie(opt), "POST", "/api/auth/passkey/login", { credential: cred }, freshIp());
  return { r, replay: () => call(challengeCookie(opt), "POST", "/api/auth/passkey/login", { credential: cred }, freshIp()) };
}

const A = ACCOUNTS.salesB;
let S1 = await session(A); // phiên PIN (máy 1)
const auth = await createFakeAuthenticator(RP);

// 1. Cấu hình bật
let r = await call(null, "GET", "/api/auth/config");
assert.equal(r.body.passkey, true);
console.log("✓ config.passkey = true");

// 2. Bật không PIN → 400; sai PIN → 403
r = await call(S1, "POST", "/api/account/passkeys/options", {});
assert.equal(r.status, 400);
r = await call(S1, "POST", "/api/account/passkeys/options", { pin: A.pin === "000000" ? "111112" : "000000" });
assert.equal(r.status, 403);
assert.equal(r.body.error.code, "invalid_credentials");
console.log("✓ bật Face ID đòi nhập lại PIN đúng");

// 3. Bật đúng → 201; danh sách có 1; nhật ký passkey_added không chứa credential id
r = await enable(S1, A.pin, auth);
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(S1, "GET", "/api/account/passkeys");
assert.equal(r.body.passkeys.length, 1);
const pkId = r.body.passkeys[0].id;
const logs = await sqlRows("SELECT action, coalesce(detail, '') AS detail FROM audit_log WHERE action LIKE 'passkey_%' OR action = 'pin_set_by_passkey'");
assert.ok(logs.some((l) => l.action === "passkey_added"));
assert.ok(logs.every((l) => !l.detail.includes(auth.id)));
console.log("✓ bật Face ID; nhật ký không chứa id khoá");

// 4. Gửi lại cùng khoá → 409 passkey_exists
r = await enable(S1, A.pin, auth);
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "passkey_exists");
console.log("✓ bật trùng khoá → 409");

// 5. Đăng nhập bằng Face ID → 200 + td_session; last_login_at cập nhật; bộ đếm 0 mọi lần vẫn được
const before = (await sqlRows(`SELECT last_login_at AS t FROM staff WHERE phone = '${A.phone}'`))[0].t;
let { r: lr, replay } = await passkeyLogin(auth);
assert.equal(lr.status, 200, JSON.stringify(lr.body));
const S2 = sessionCookie(lr);
assert.ok(S2);
assert.equal((await call(S2, "GET", "/api/auth/me")).status, 200);
assert.notEqual((await sqlRows(`SELECT last_login_at AS t FROM staff WHERE phone = '${A.phone}'`))[0].t, before);
assert.equal((await passkeyLogin(auth)).r.status, 200);
console.log("✓ đăng nhập Face ID; bộ đếm 0 lặp lại vẫn được");

// 6. Gửi lại đúng lần đăng nhập cũ (cookie + chữ ký) → từ chối
r = await replay();
assert.equal(r.status, 400);
assert.equal(r.body.error.code, "passkey_expired");
console.log("✓ thách thức dùng một lần");

// 7. Sai origin / sai rpId / thiếu UV / chữ ký sửa → 401 passkey_invalid
for (const o of [{ origin: "https://evil.example" }, { rpId: "evil.example" }, { flags: 0x01 }, { tamper: true }]) {
  const x = (await passkeyLogin(auth, o)).r;
  assert.equal(x.status, 401, JSON.stringify(o));
  assert.equal(x.body.error.code, "passkey_invalid");
}
console.log("✓ chữ ký/origin/rpId/UV sai bị từ chối");

// 8. Cookie thách thức đặt vào chỗ td_session → 401
const opt = await call(null, "POST", "/api/auth/passkey/options", {}, freshIp());
const fake = challengeCookie(opt).replace("td_webauthn=", "td_session=");
assert.equal((await call(fake, "GET", "/api/auth/me")).status, 401);
console.log("✓ cookie thách thức không phải phiên");

// 9. Bảo trì bật → 503 maintenance qua Face ID
await sql("UPDATE mnt_setting SET enabled = 1, ends_at = NULL WHERE id = 'default'");
r = (await passkeyLogin(auth)).r;
assert.equal(r.status, 503);
assert.equal(r.body.error.code, "maintenance");
await sql("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
console.log("✓ bảo trì chặn đăng nhập Face ID");

// 10. Đặt PIN bằng Face ID: thách thức login không dùng được; PIN yếu 400; đúng thì PIN cũ hết, PIN mới được; máy khác 401, máy hiện tại 200
const S3 = sessionCookie((await passkeyLogin(auth)).r);
const loginOpt = await call(null, "POST", "/api/auth/passkey/options", {}, freshIp());
r = await call(cookieJar(S3, challengeCookie(loginOpt)), "POST", "/api/account/pin-by-passkey", { newPin: "583920", credential: await auth.sign(loginOpt.body.publicKey.challenge) });
assert.equal(r.status, 400);
assert.equal(r.body.error.code, "passkey_expired");
let pOpt = await call(S3, "POST", "/api/account/pin-by-passkey/options", {});
assert.equal(pOpt.status, 200);
r = await call(cookieJar(S3, challengeCookie(pOpt)), "POST", "/api/account/pin-by-passkey", { newPin: "123456", credential: await auth.sign(pOpt.body.publicKey.challenge) });
assert.equal(r.status, 400);
pOpt = await call(S3, "POST", "/api/account/pin-by-passkey/options", {});
r = await call(cookieJar(S3, challengeCookie(pOpt)), "POST", "/api/account/pin-by-passkey", { newPin: "583920", credential: await auth.sign(pOpt.body.publicKey.challenge) });
assert.equal(r.status, 200, JSON.stringify(r.body));
const S3b = sessionCookie(r);
assert.equal((await call(S3b, "GET", "/api/auth/me")).status, 200);
assert.equal((await call(S2, "GET", "/api/auth/me")).status, 401);
assert.equal((await login(A.phone, A.pin, freshIp())).status, 401);
assert.equal((await login(A.phone, "583920", freshIp())).status, 200);
console.log("✓ đặt PIN bằng Face ID");

// 11. Passkey của người khác không đặt được PIN cho mình
const other = await createFakeAuthenticator(RP);
const SO = await session(ACCOUNTS.field);
const enabledOther = await enable(SO, ACCOUNTS.field.pin, other);
assert.equal(enabledOther.status, 201, JSON.stringify(enabledOther.body));
const otherPkId = enabledOther.body.passkey.id;
pOpt = await call(S3b, "POST", "/api/account/pin-by-passkey/options", {});
r = await call(cookieJar(S3b, challengeCookie(pOpt)), "POST", "/api/account/pin-by-passkey", { newPin: "583921", credential: await other.sign(pOpt.body.publicKey.challenge) });
assert.equal(r.status, 403);
console.log("✓ không dùng Face ID của người khác");

// 12. Gỡ một passkey: máy khác 401, máy đang thao tác nhận phiên mới 200; đăng nhập bằng khoá đã gỡ → 401 passkey_unknown
const S4 = sessionCookie((await passkeyLogin(auth)).r);
r = await call(S3b, "DELETE", `/api/account/passkeys/${pkId}`);
assert.equal(r.status, 200);
const S3c = sessionCookie(r) ?? S3b;
assert.equal((await call(S3c, "GET", "/api/auth/me")).status, 200);
assert.equal((await call(S4, "GET", "/api/auth/me")).status, 401);
r = (await passkeyLogin(auth)).r;
assert.equal(r.status, 401);
assert.equal(r.body.error.code, "passkey_unknown");
console.log("✓ gỡ Face ID đăng xuất máy khác; khoá đã gỡ bị từ chối rõ ràng");

// 12b. (kiểm độc lập Task 8) Gỡ passkey của NGƯỜI KHÁC bằng route tự phục vụ → 404, passkey đó vẫn còn nguyên
r = await call(S3c, "DELETE", `/api/account/passkeys/${otherPkId}`);
assert.equal(r.status, 404);
assert.equal(r.body.error.code, "not_found");
r = await call(SO, "GET", "/api/account/passkeys");
assert.equal(r.body.passkeys.length, 1);
assert.equal(r.body.passkeys[0].id, otherPkId);
console.log("✓ không gỡ được Face ID của người khác qua route tự phục vụ");

// 12c. Bổ sung T9 (rulings.md "Bổ sung cho T9"): tài khoản bị ngưng bằng SQL mà passkey CHƯA bị gỡ (đường API luôn gỡ; đây là mô phỏng
// tình huống lọt) → đăng nhập Face ID vẫn phải bị từ chối (getActiveStaff lọc active = 0). Khoá `auth` đã bị gỡ ở bước 12 nên bật khoá mới trước.
const authB2 = await createFakeAuthenticator(RP);
r = await enable(S3c, "583920", authB2);
assert.equal(r.status, 201, JSON.stringify(r.body));
await sql(`UPDATE staff SET active = 0 WHERE phone = '${A.phone}'`);
r = (await passkeyLogin(authB2)).r;
assert.equal(r.status, 401);
assert.equal(r.body.error.code, "passkey_unknown");
await sql(`UPDATE staff SET active = 1 WHERE phone = '${A.phone}'`);
console.log("✓ tài khoản ngưng bằng SQL (passkey chưa gỡ) → Face ID vẫn bị từ chối");

// 13. Admin: ngưng tài khoản giữa lúc lấy thách thức và gửi → từ chối; nút admin gỡ
const ADMIN = await session(ACCOUNTS.admin);
const fieldId = (await call(SO, "GET", "/api/auth/me")).body.staff.id;
const optMid = await call(null, "POST", "/api/auth/passkey/options", {}, freshIp());
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${fieldId}`, { active: false })).status, 200);
r = await call(challengeCookie(optMid), "POST", "/api/auth/passkey/login", { credential: await other.sign(optMid.body.publicKey.challenge) }, freshIp());
assert.equal(r.status, 401);
// 8b: thêm assert gỡ passkey khi ngưng (PATCH /api/staff/:id với active:false CHƯA gỡ passkey — chờ chủ quyết A-4; xem task-8-report.md)
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${fieldId}`, { active: true })).status, 200);
console.log("✓ ngưng tài khoản chặn đăng nhập Face ID ngay (kể cả khi thách thức đã lấy trước)");

// 13b. Bật lại Face ID cho field; đặt lại PIN (admin) và gỡ-tất-cả (admin) đều làm khoá cũ mất hiệu lực; passkeyCount đúng trước/sau
// (field đã có 1 khoá `other` còn hiệu lực từ bước 11 — Bước 4 của Task 8 CHƯA gỡ passkey khi ngưng tài khoản, xem "8b" ở trên — nên sau khi bật thêm `other2` tổng là 2)
const other2 = await createFakeAuthenticator(RP);
r = await enable(SO, ACCOUNTS.field.pin, other2);
assert.equal(r.status, 201, JSON.stringify(r.body));
let staffRow = (await call(ADMIN, "GET", "/api/staff")).body.staff.find((s) => s.id === fieldId);
assert.equal(staffRow.passkeyCount, 2, JSON.stringify(staffRow));
r = await call(ADMIN, "POST", `/api/staff/${fieldId}/reset-pin`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.passkeyCount, 0);
const newFieldPin = r.body.pin;
const resetLog = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'passkey_removed' AND target_id = '${fieldId}' AND detail = 'gỡ khi đặt lại PIN'`);
assert.equal(resetLog[0].n, 1);
r = (await passkeyLogin(other2)).r;
assert.equal(r.status, 401);
assert.equal(r.body.error.code, "passkey_unknown");
console.log("✓ đặt lại PIN (admin) gỡ Face ID; passkeyCount về 0; đúng một dòng nhật ký");

const SO2 = await session({ phone: ACCOUNTS.field.phone, pin: newFieldPin });
const other3 = await createFakeAuthenticator(RP);
r = await enable(SO2, newFieldPin, other3);
assert.equal(r.status, 201, JSON.stringify(r.body));
staffRow = (await call(ADMIN, "GET", "/api/staff")).body.staff.find((s) => s.id === fieldId);
assert.equal(staffRow.passkeyCount, 1, JSON.stringify(staffRow));
r = await call(ADMIN, "POST", `/api/staff/${fieldId}/passkeys/remove-all`, {});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.passkeyCount, 0);
r = (await passkeyLogin(other3)).r;
assert.equal(r.status, 401);
assert.equal(r.body.error.code, "passkey_unknown");
console.log("✓ quản trị viên gỡ Face ID trực tiếp; passkeyCount về 0; khoá đã gỡ bị từ chối");

// 14. Sai PIN ở bước bật tính vào cùng bộ đếm. Dùng tài khoản accountant: 5 lần sai PIN ở bước bật rồi đăng nhập → 429; admin mở khoá lại.
const ACC = ACCOUNTS.accountant;
const SAcc = await session(ACC);
const accId = (await call(SAcc, "GET", "/api/auth/me")).body.staff.id;
const wrongAccPin = ACC.pin === "000000" ? "111112" : "000000";
const ipAcc = freshIp();
for (let i = 1; i <= 5; i++) {
  r = await call(SAcc, "POST", "/api/account/passkeys/options", { pin: wrongAccPin }, ipAcc);
  assert.equal(r.status, 403, `lần ${i}: ${JSON.stringify(r.body)}`);
}
r = await login(ACC.phone, ACC.pin, ipAcc);
assert.equal(r.status, 429, JSON.stringify(r.body));
assert.equal(r.body.error.code, "too_many_attempts");
assert.equal((await call(ADMIN, "POST", `/api/staff/${accId}/unlock`, {})).status, 200);
console.log("✓ sai PIN khi bật Face ID tính chung bộ đếm chống dò với đăng nhập; admin mở khoá xong");

// 15. Gỡ hết khi đã hết passkey → 200 { removed: 0 }, không có set-cookie
const SA = await session(ACCOUNTS.salesA);
r = await call(SA, "POST", "/api/account/passkeys/remove-all", {});
assert.equal(r.status, 200);
assert.deepEqual(r.body, { removed: 0 });
assert.equal(r.cookie, null);
console.log("✓ gỡ hết khi không có passkey nào → removed: 0, không cấp phiên mới");

// Nhật ký ba hành động mới (passkey_added, passkey_removed, pin_set_by_passkey) không lộ id khoá (đặc tả §2, tiêu chí 6)
const allLogs = await sqlRows("SELECT action, coalesce(detail, '') AS detail FROM audit_log WHERE action IN ('passkey_added', 'passkey_removed', 'pin_set_by_passkey')");
assert.ok(allLogs.length > 0);
const knownCredentialIds = [auth.id, other.id, other2.id, other3.id, authB2.id];
for (const l of allLogs) for (const cid of knownCredentialIds) assert.ok(!l.detail.includes(cid), `${l.action}: "${l.detail}" chứa id khoá ${cid}`);
console.log("✓ nhật ký passkey_added/passkey_removed/pin_set_by_passkey không chứa id khoá nào");

console.log("E2E PASSKEY OK");
