// Cloudflare Turnstile ở đăng nhập, phía máy chủ. Server e2e do run.mjs dựng ĐÃ BẬT Turnstile bằng khoá thử chính thức của Cloudflare
// (luôn đạt); cần mạng vì máy chủ gọi siteverify thật. Ở đây kiểm: cấu hình công khai, thiếu token → 403 mà KHÔNG tiêu hao lượt thử PIN,
// token thử → qua Turnstile rồi mới đến kiểm PIN (và chống dò PIN vẫn chạy), và hợp đồng với siteverify thật (đạt/hỏng/secret sai).
// Trạng thái "không bật Turnstile" (config trả null, đăng nhập bỏ qua kiểm) là luật thuần → src/modules/auth/turnstile.test.ts.
import assert from "node:assert/strict";
import { ACCOUNTS, TURNSTILE_TEST, call, freshIp, login, randomPhone, session, sqlRows } from "./lib.mjs";
import { verifyTurnstile } from "../../src/modules/auth/turnstile.ts";

const FAILED = { code: "turnstile_failed", message: "Chưa xác minh được bạn là người thật. Hãy thử lại." };
const post = (body, ip) => call(null, "POST", "/api/auth/login", body, ip);
const wrongPin = (pin) => (pin === "999888" ? "999887" : "999888");

/** Số lần thử đang được ghi cho các khoá `phone:…` / `ip:…` (bảng login_attempt). */
const attempts = async (...keys) => {
  const rows = await sqlRows(`SELECT key, count(*) AS n FROM login_attempt WHERE key IN (${keys.map((k) => `'${k}'`).join(", ")}) GROUP BY key`);
  return Object.fromEntries(rows.map((r) => [r.key, r.n]));
};

const ADMIN = await session(ACCOUNTS.admin);
/** Tài khoản dùng một lần (SĐT ngẫu nhiên) — KHÔNG đụng ACCOUNTS.*: kịch bản khác dùng chung D1 và các tài khoản đó. */
async function mk(name) {
  const phone = randomPhone();
  const r = await call(ADMIN, "POST", "/api/staff", { fullName: name, phone });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return { id: r.body.staff.id, phone: r.body.staff.phone, pin: r.body.pin };
}

// --- cấu hình công khai: chưa đăng nhập vẫn đọc được; trả đúng khoá site đã đặt cho server này; chỉ đọc; không lưu đệm
let r = await call(null, "GET", "/api/auth/config");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.match(r.headers.get("content-type"), /^application\/json/);
assert.equal(r.headers.get("cache-control"), "no-store");
assert.deepEqual(r.body, { turnstileSiteKey: TURNSTILE_TEST.siteKey }, "server e2e phải được bật Turnstile bằng khoá thử (run.mjs truyền --var TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY)");
assert.doesNotMatch(JSON.stringify(r.body), /secret|1x0000000000000000000000000000000AA/i, "tuyệt đối không lộ khoá bí mật");
assert.deepEqual((await call(ADMIN, "GET", "/api/auth/config")).body, r.body, "đã đăng nhập cũng thấy như nhau");
r = await call(null, "POST", "/api/auth/config", {});
assert.equal(r.status, 405);
assert.match(r.headers.get("allow"), /GET/);
console.log("✓ GET /api/auth/config: công khai, no-store, đúng khoá site, không lộ secret, chỉ đọc");

// --- THIẾU TOKEN → 403 turnstile_failed và KHÔNG tiêu hao lượt thử PIN của SĐT (cũng không của IP)
const A = await mk("Thử Turnstile Một");
const ipA = freshIp();
for (let i = 1; i <= 6; i++) {
  r = await post({ phone: A.phone, pin: wrongPin(A.pin) }, ipA); // sai PIN, không token — gấp đôi giới hạn 5 lần của SĐT
  assert.equal(r.status, 403, `lần ${i}: thiếu token phải 403 chứ không 401/429 — ${JSON.stringify(r.body)}`);
  assert.deepEqual(r.body, { error: FAILED });
  assert.equal(r.cookie, null);
}
const badTokens = [null, "", "   ", 0, 12345, true, {}, ["XXXX.DUMMY.TOKEN.XXXX"], "x".repeat(3000)]; // mọi dạng "token" hỏng: không cần hỏi Cloudflare
for (const turnstileToken of badTokens) {
  r = await post({ phone: A.phone, pin: wrongPin(A.pin), turnstileToken }, ipA);
  assert.equal(r.status, 403, `token ${JSON.stringify(turnstileToken)?.slice(0, 30)} → ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "turnstile_failed");
}
r = await post({ phone: A.phone, pin: A.pin }, ipA); // PIN ĐÚNG mà thiếu token: vẫn bị chặn, không có cookie phiên
assert.equal(r.status, 403);
assert.equal(r.body.error.code, "turnstile_failed");
assert.equal(r.cookie, null, "không được cấp phiên khi chưa qua Turnstile");
assert.deepEqual(await attempts(`phone:${A.phone}`, `ip:${ipA}`), {}, "bộ đếm chống dò của SĐT và của IP phải còn nguyên (không dòng nào)");
r = await login(A.phone, A.pin, ipA); // cùng SĐT, cùng IP, PIN đúng + token thử: đăng nhập được (bằng chứng không bị khoá)
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, A.phone);
assert.ok(r.cookie?.startsWith("td_session="));
assert.equal((await call(r.cookie, "GET", "/api/auth/me")).status, 200);
console.log("✓ thiếu/hỏng token → 403 turnstile_failed (6 lần sai PIN + 9 dạng token hỏng) và không tiêu hao lượt PIN; sau đó đăng nhập đúng vẫn được");

// --- đầu vào sai → 400 (không tốn token vô ích); token thử → qua Turnstile rồi MỚI kiểm PIN, chống dò PIN vẫn chạy phía sau
r = await post({ pin: A.pin, turnstileToken: TURNSTILE_TEST.dummyToken });
assert.equal(r.status, 400);
assert.equal(r.body.error.code, "invalid_input");
assert.equal((await post({})).status, 400);
const B = await mk("Thử Turnstile Hai");
const ipB = freshIp();
const withToken = (pin) => post({ phone: B.phone, pin, turnstileToken: TURNSTILE_TEST.dummyToken }, ipB);
r = await withToken(wrongPin(B.pin));
assert.equal(r.status, 401, "qua Turnstile rồi thì đến lượt kiểm PIN: sai PIN → 401");
assert.equal(r.body.error.code, "invalid_credentials");
assert.deepEqual(await attempts(`phone:${B.phone}`), { [`phone:${B.phone}`]: 1 }, "chỉ lần thử đã QUA Turnstile mới bị đếm");
for (let i = 2; i <= 5; i++) assert.equal((await withToken(wrongPin(B.pin))).status, 401, `lần ${i}`);
r = await withToken(B.pin); // PIN đúng nhưng SĐT đã đủ 5 lần sai: chống dò PIN vẫn chặn (429), không bị Turnstile "tha"
assert.equal(r.status, 429, JSON.stringify(r.body));
assert.equal(r.body.error.code, "too_many_attempts");
console.log("✓ token thử → qua Turnstile, sai PIN → 401 và bị đếm; đủ 5 lần → 429 (chống dò vẫn chạy sau Turnstile)");

// --- Turnstile đứng TRƯỚC bộ chống dò: người không có token nhận 403 kể cả với SĐT đang bị khoá (không lộ trạng thái khoá, không ghi thêm lượt)
r = await post({ phone: B.phone, pin: B.pin }, ipB);
assert.equal(r.status, 403, "SĐT đang bị khoá mà thiếu token: 403 chứ không 429");
assert.equal(r.body.error.code, "turnstile_failed");
assert.deepEqual(await attempts(`phone:${B.phone}`), { [`phone:${B.phone}`]: 5 }, "không ghi thêm lượt nào");
assert.equal((await call(ADMIN, "POST", `/api/staff/${B.id}/unlock`, {})).status, 200);
assert.equal((await withToken(B.pin)).status, 200, "admin mở khoá → đăng nhập lại được");
console.log("✓ Turnstile chạy trước chống dò: thiếu token trên SĐT đang khoá → 403, không ghi thêm lượt");

// --- hợp đồng với siteverify THẬT của Cloudflare (khoá thử; cần mạng): verifyTurnstile diễn giải đúng từng phản hồi thật
assert.deepEqual(await verifyTurnstile({ secret: TURNSTILE_TEST.secret, token: TURNSTILE_TEST.dummyToken, ip: "203.0.113.7" }), { ok: true });
assert.deepEqual(await verifyTurnstile({ secret: TURNSTILE_TEST.secret, token: TURNSTILE_TEST.dummyToken, ip: null }), { ok: true }, "không có IP → bỏ remoteip, vẫn đạt");
assert.deepEqual(await verifyTurnstile({ secret: TURNSTILE_TEST.alwaysFailSecret, token: TURNSTILE_TEST.dummyToken, ip: "203.0.113.7" }), { ok: false, reason: "failed", detail: "invalid-input-response" });
assert.deepEqual(await verifyTurnstile({ secret: TURNSTILE_TEST.alreadySpentSecret, token: TURNSTILE_TEST.dummyToken, ip: null }), { ok: false, reason: "failed", detail: "timeout-or-duplicate" });
assert.deepEqual(
  await verifyTurnstile({ secret: "not-a-real-secret", token: TURNSTILE_TEST.dummyToken, ip: null }),
  { ok: false, reason: "unavailable", detail: "invalid-input-secret" },
  "secret sai: siteverify trả HTTP 400 — phải thành unavailable (lỗi cấu hình của ta), không phải failed",
);
console.log("✓ siteverify thật: đạt / hỏng / token đã dùng → đúng phân loại; secret sai → unavailable");

console.log("E2E TURNSTILE OK");
