// E2E mã email ở bước đăng nhập (ADR-0074 điều 4; kế hoạch Phần C Task 2) trên wrangler dev thật. Bài cùng ý chạy không mạng (có bộ gửi thư giả — đường
// gửi THÀNH CÔNG chỉ thấy ở đó): src/modules/auth/hai-lop-email.test.ts.
// - wrangler dev của e2e KHÔNG có người gửi (FEEDBACK_MAIL_FROM) ⇒ mọi lần gửi trả 502 "Chưa gửi được email…" — đó là hành vi mong đợi (như feedback.mjs:
//   "chưa gửi được mail"); dòng mã vẫn được ghi trước và hạn mức gửi vẫn tính.
// - e2e không đọc được hộp thư và mã sản phẩm không có công tắc lộ mã: kịch bản lấy mã bằng cách GIEO dòng aut_mfa_email_code với mã biết trước (gieoMaEmail).
// - Tài khoản Bán hàng DÙNG MỘT LẦN (SĐT ngẫu nhiên) — không dùng salesA (yếu tố sống trên tài khoản dùng chung làm `session()` của kịch bản sau bị hỏi mã).
//   Yếu tố EMAIL / TOTP của A, C gieo thẳng bằng SQL; ca 9–12 (Task 3) bật yếu tố email qua route thật trên tài khoản dùng một lần D; ca 13 (vòng sửa 1) trên tài khoản dùng một lần E. Ca 429 chạy CUỐI (khoá mfa-mail:<id> 15 phút, chỉ của tài khoản thử).
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { insertStaffSql } from "../../scripts/staff-lib.mjs";
import { maHoaKhoa } from "./fake-totp.mjs";
import { ACCOUNTS, TURNSTILE_TEST, call, freshIp, gieoMaEmail, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const KHOA = process.env.E2E_MFA_KEY;
if (!KHOA) throw new Error("Thiếu E2E_MFA_KEY (run.mjs truyền cùng giá trị --var MFA_ENCRYPTION_KEY cho wrangler dev)");
const LOI_502 = { code: "mail_failed", message: "Chưa gửi được email, thử lại hoặc dùng cách khác." };

const cookieOf = (r, name) => {
  const c = r.headers.getSetCookie().find((x) => x.startsWith(`${name}=`) && !x.startsWith(`${name}=;`));
  return c ? c.split(";")[0] : null;
};
const pinLogin = (acc) => call(null, "POST", "/api/auth/login", { phone: acc.phone, pin: acc.pin, turnstileToken: TURNSTILE_TEST.dummyToken }, freshIp());
async function pendingOf(acc) {
  const r = await pinLogin(acc);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.next, "mfa", JSON.stringify(r.body));
  return cookieOf(r, "td_mfa_pending");
}
const guiMa = (pending) => call(pending, "POST", "/api/auth/mfa/email", {}, freshIp());
const verify = (pending, code) => call(pending, "POST", "/api/auth/mfa/verify", { method: "EMAIL", code, trustDevice: false }, freshIp());
async function taoTaiKhoan(name) {
  const acc = { name, phone: randomPhone(), pin: String(200000 + Math.floor(Math.random() * 700000)) };
  await sql((await insertStaffSql({ ...acc, permissions: ["SALES"] })).replace(/\n/g, " "));
  const [{ id }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${acc.phone}'`);
  return { ...acc, id };
}
const at = new Date().toISOString();
const yeuTo = (staffId, kind, secretEnc, email) =>
  `INSERT INTO aut_mfa_factor (id, staff_id, kind, secret_enc, email, last_totp_step, valid_from_at, valid_to_at, created_at, created_by, updated_at, updated_by) ` +
  `VALUES ('${randomBytes(8).toString("hex")}', '${staffId}', '${kind}', ${secretEnc ? `'${secretEnc}'` : "NULL"}, ${email ? `'${email}'` : "NULL"}, 0, '${at}', NULL, '${at}', '${staffId}', '${at}', '${staffId}');`;

// ---- Chuẩn bị: A có yếu tố EMAIL; C chỉ có TOTP.
const A = await taoTaiKhoan("Hai Lớp Email Thử");
const EMAIL = `e2e.${randomBytes(4).toString("hex")}@example.com`;
const C = await taoTaiKhoan("Hai Lớp TOTP Thử");
await sql(yeuTo(A.id, "EMAIL", null, EMAIL) + " " + yeuTo(C.id, "TOTP", maHoaKhoa(KHOA, randomBytes(20)), null));
const dongMa = () => sqlRows(`SELECT id, used_at, revoked_at FROM aut_mfa_email_code WHERE staff_id = '${A.id}' ORDER BY created_at, rowid`);
let soLanGui = 0;

// 1. PIN đúng → next=mfa, có EMAIL, địa chỉ chỉ hiện dạng che
let r = await pinLogin(A);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { next: "mfa", factors: ["EMAIL", "RECOVERY"], emailMask: "e***@example.com" });
const P1 = cookieOf(r, "td_mfa_pending");
assert.ok(P1);
console.log("✓ 1. PIN đúng → next=mfa, factors có EMAIL, emailMask che");

// 2. Gửi mã: máy e2e không có người gửi → 502 lời thường; dòng mã đã ghi TRƯỚC (còn mở, chỉ băm)
r = await guiMa(P1);
soLanGui++;
assert.equal(r.status, 502, JSON.stringify(r.body));
assert.deepEqual(r.body.error, LOI_502);
let rows = await dongMa();
assert.equal(rows.length, 1);
assert.equal(rows[0].used_at, null);
assert.equal(rows[0].revoked_at, null);
console.log("✓ 2. gửi mã khi chưa cấu hình người gửi → 502 \"Chưa gửi được email…\"; dòng mã vẫn được ghi");

// 3. Mã gieo đúng → 200 + td_session (PIN_MFA)
const K1 = "246810";
await gieoMaEmail(A.id, EMAIL, K1);
r = await verify(P1, K1);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, A.phone);
const S1 = cookieOf(r, "td_session");
assert.ok(S1);
assert.equal((await call(S1, "GET", "/api/auth/me")).status, 200);
assert.equal((await sqlRows(`SELECT method FROM aut_session WHERE staff_id = '${A.id}' ORDER BY created_at DESC LIMIT 1`))[0].method, "PIN_MFA");
console.log("✓ 3. mã email đúng → 200 + td_session, sổ phiên PIN_MFA");

// 4. Dùng lại mã vừa dùng → 401
r = await verify(await pendingOf(A), K1);
assert.equal(r.status, 401, JSON.stringify(r.body));
assert.equal(r.body.error.code, "invalid_code");
console.log("✓ 4. dùng lại mã email vừa dùng → 401");

// 5. Mã cũ sau khi gửi mã mới → 401 (gửi mã mới huỷ mã mở cũ)
const P2 = await pendingOf(A);
const K2 = "135791";
const idK2 = await gieoMaEmail(A.id, EMAIL, K2);
r = await guiMa(P2);
soLanGui++;
assert.equal(r.status, 502, JSON.stringify(r.body));
assert.notEqual((await sqlRows(`SELECT revoked_at FROM aut_mfa_email_code WHERE id = '${idK2}'`))[0].revoked_at, null, "mã cũ bị huỷ khi gửi mã mới");
r = await verify(P2, K2);
assert.equal(r.status, 401, JSON.stringify(r.body));
assert.equal(cookieOf(r, "td_session"), null);
console.log("✓ 5. mã cũ sau khi gửi mã mới → 401");

// 6. Tài khoản không có yếu tố email gọi gửi → 409
r = await guiMa(await pendingOf(C));
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "no_email_factor");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_email_code WHERE staff_id = '${C.id}'`))[0].n, 0);
console.log("✓ 6. tài khoản không có yếu tố email gọi gửi → 409");

// 7. Nhật ký không chứa địa chỉ email, mã
const nhatKy = JSON.stringify(await sqlRows("SELECT * FROM audit_log"));
for (const d of [EMAIL, K1, K2]) assert.ok(!nhatKy.includes(d), `nhật ký chứa "${d}"`);
console.log("✓ 7. nhật ký không chứa địa chỉ email / mã");

// ---- Phần C Task 3: tự bật yếu tố email; vai lớn chỉ dùng ứng dụng xác thực (ADR-0074 điều 7). Tài khoản Bán hàng DÙNG MỘT LẦN D (không dùng salesA như
// brief viết: yếu tố sống trên tài khoản dùng chung làm `session()` của kịch bản sau bị hỏi mã — lệch có chủ ý, ghi ở báo cáo Task 3).
const D = await taoTaiKhoan("Hai Lớp Email Tự Bật");
const EMAIL_D = `E2E.Tu.${randomBytes(4).toString("hex")}@Example.com`; // gõ chữ hoa — máy chủ lưu dạng chuẩn hoá
const EMAIL_D_CHUAN = EMAIL_D.toLowerCase();
r = await pinLogin(D);
assert.equal(r.status, 200, JSON.stringify(r.body));
const SD = cookieOf(r, "td_session");
assert.ok(SD, "D chưa có yếu tố, còn ân hạn → vào thẳng");

// 9. start: máy e2e không có người gửi → 502 lời thường, NHƯNG dòng mã bật (purpose enroll) đã ghi trước; chưa có yếu tố nào được lưu
r = await call(SD, "POST", "/api/account/mfa/email/start", { email: EMAIL_D });
assert.equal(r.status, 502, JSON.stringify(r.body));
assert.deepEqual(r.body.error, LOI_502);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_email_code WHERE staff_id = '${D.id}' AND purpose = 'enroll'`))[0].n, 1);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = '${D.id}'`))[0].n, 0);
// confirm với mã sai → 401, không lưu
const K3 = "975310";
await gieoMaEmail(D.id, EMAIL_D_CHUAN, K3, "enroll");
r = await call(SD, "POST", "/api/account/mfa/email/confirm", { email: EMAIL_D, code: "000001" });
assert.equal(r.status, 401, JSON.stringify(r.body));
// confirm đúng → yếu tố EMAIL + 10 mã dự phòng + nhật ký mfa_enabled "EMAIL"
r = await call(SD, "POST", "/api/account/mfa/email/confirm", { email: EMAIL_D, code: K3 });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.recoveryCodes.length, 10);
assert.deepEqual(await sqlRows(`SELECT kind, email FROM aut_mfa_factor WHERE staff_id = '${D.id}' AND valid_to_at IS NULL`), [{ kind: "EMAIL", email: EMAIL_D_CHUAN }]);
assert.deepEqual((await sqlRows(`SELECT detail FROM audit_log WHERE action = 'mfa_enabled' AND staff_id = '${D.id}'`)).map((x) => x.detail), ["EMAIL"]);
r = await call(SD, "GET", "/api/account/mfa");
assert.deepEqual(r.body.factors.map((f) => [f.kind, f.emailMask]), [["EMAIL", "e***@example.com"]]);
assert.ok(!JSON.stringify(r.body).includes(EMAIL_D_CHUAN));
console.log("✓ 9. tự bật email: start 502 (dòng mã vẫn ghi) → confirm sai 401 → mã gieo đúng: yếu tố EMAIL + 10 mã dự phòng + nhật ký; GET chỉ địa chỉ che");

// 10. Đăng nhập PIN → bước hai có EMAIL → mã email gieo → vào được
r = await pinLogin(D);
assert.deepEqual(r.body, { next: "mfa", factors: ["EMAIL", "RECOVERY"], emailMask: "e***@example.com" });
const PD = cookieOf(r, "td_mfa_pending");
await gieoMaEmail(D.id, EMAIL_D_CHUAN, "864201");
r = await verify(PD, "864201");
assert.equal(r.status, 200, JSON.stringify(r.body));
const SD2 = cookieOf(r, "td_session");
assert.ok(SD2);
console.log("✓ 10. đăng nhập PIN → bước hai EMAIL → mã email đúng → vào được");

// 11. Quản trị / Kế toán bật email → 409 đúng câu (trước mọi ghi — không đổi gì trên tài khoản dùng chung)
for (const acc of [ACCOUNTS.admin, ACCOUNTS.accountant]) {
  r = await call(await session(acc), "POST", "/api/account/mfa/email/start", { email: EMAIL_D });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Tài khoản Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực.");
}
console.log("✓ 11. Quản trị / Kế toán bật email → 409 \"…chỉ dùng ứng dụng xác thực.\"");

// 12. D được gán vai Kế toán → yếu tố email hết hiệu lực trong cùng lô; mọi phiên cũ kết thúc (vòng sửa 1); đăng nhập lại: GET /api/account/mfa không còn
// EMAIL, chỉ được TOTP
const SA = await session(ACCOUNTS.superAdmin);
r = await call(SA, "PUT", `/api/staff/${D.id}/roles`, { roles: ["ACCOUNTANT"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_mfa_factor WHERE staff_id = '${D.id}' AND valid_to_at IS NULL`))[0].n, 0);
for (const s of [SD, SD2]) assert.equal((await call(s, "GET", "/api/auth/me")).status, 401, "phiên cũ (có phiên sinh từ mã email) phải kết thúc");
r = await pinLogin(D);
assert.equal(r.status, 200, JSON.stringify(r.body));
const SD3 = cookieOf(r, "td_session");
assert.ok(SD3, "còn ân hạn (14 ngày từ lúc tạo) và không còn yếu tố → vào thẳng, dải nhắc bật ứng dụng xác thực");
r = await call(SD3, "GET", "/api/account/mfa");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.factors, []);
assert.deepEqual(r.body.allowed, ["TOTP"]);
console.log("✓ 12. gán vai Kế toán → yếu tố email hết hiệu lực, phiên cũ 401; đăng nhập lại: GET không còn EMAIL, chỉ cho TOTP");

// 13. (vòng sửa 1, an ninh) E có TOTP + EMAIL, đăng nhập bằng mã email + "tin máy này" → được gán vai Kế toán → phiên cũ 401; PIN kèm cookie máy tin cũ
// KHÔNG còn bỏ qua bước hai: next=mfa, chỉ TOTP / mã dự phòng; máy tin bị thu hồi lý do 'tat_hai_lop'
const E = await taoTaiKhoan("Hai Lớp Email Tin Máy");
const EMAIL_E = `e2e.tin.${randomBytes(4).toString("hex")}@example.com`;
await sql(yeuTo(E.id, "TOTP", maHoaKhoa(KHOA, randomBytes(20)), null) + " " + yeuTo(E.id, "EMAIL", null, EMAIL_E));
const PE = await pendingOf(E);
await gieoMaEmail(E.id, EMAIL_E, "753195");
r = await call(PE, "POST", "/api/auth/mfa/verify", { method: "EMAIL", code: "753195", trustDevice: true }, freshIp());
assert.equal(r.status, 200, JSON.stringify(r.body));
const SE = cookieOf(r, "td_session");
const TE = cookieOf(r, "td_trusted");
assert.ok(SE && TE);
const pinVoiMayTin = () => call(TE, "POST", "/api/auth/login", { phone: E.phone, pin: E.pin, turnstileToken: TURNSTILE_TEST.dummyToken }, freshIp());
r = await pinVoiMayTin();
assert.equal(r.status, 200, JSON.stringify(r.body));
const SE2 = cookieOf(r, "td_session");
assert.ok(SE2, "trước khi đổi vai: máy tin bỏ qua bước hai");
r = await call(SA, "PUT", `/api/staff/${E.id}/roles`, { roles: ["ACCOUNTANT"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
for (const s of [SE, SE2]) assert.equal((await call(s, "GET", "/api/auth/me")).status, 401, "phiên sinh từ mã email / máy tin phải kết thúc");
r = await pinVoiMayTin();
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(cookieOf(r, "td_session"), null, "máy tin cũ không còn bỏ qua bước hai");
assert.deepEqual(r.body, { next: "mfa", factors: ["TOTP", "RECOVERY"], emailMask: null });
assert.deepEqual(await sqlRows(`SELECT DISTINCT revoke_reason FROM aut_trusted_device WHERE staff_id = '${E.id}'`), [{ revoke_reason: "tat_hai_lop" }]);
console.log("✓ 13. đăng nhập bằng mã email + tin máy → gán vai Kế toán → phiên cũ 401; máy tin cũ phải hỏi mã (chỉ TOTP / dự phòng)");

const nhatKy2 = JSON.stringify(await sqlRows("SELECT * FROM audit_log"));
for (const d of [EMAIL_D_CHUAN, K3, EMAIL_E]) assert.ok(!nhatKy2.includes(d), `nhật ký chứa "${d}"`);

// 8. (CUỐI) Hạn mức gửi 3 thư / 15 phút — lần thứ 4 trong 15 phút → 429, không ghi thêm dòng mã
assert.equal(soLanGui, 2);
r = await guiMa(await pendingOf(A));
soLanGui++;
assert.equal(r.status, 502, JSON.stringify(r.body));
const truoc = (await dongMa()).length;
r = await guiMa(await pendingOf(A));
assert.equal(r.status, 429, JSON.stringify(r.body));
assert.equal(r.body.error.code, "too_many_attempts");
assert.ok(Number(r.headers.get("retry-after")) > 0);
assert.equal((await dongMa()).length, truoc, "429 không ghi dòng mã mới");
console.log("✓ 8. gửi lần 4 trong 15 phút → 429");

console.log("E2E HAI LỚP EMAIL OK");
