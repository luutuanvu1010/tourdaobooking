// E2E sổ phiên đăng nhập, phần đăng xuất + lời báo lý do (ADR-0075, Task 4). Dùng salesA (chịu luật một máy); cookie lấy TƯỜNG MINH từ đăng nhập
// và gửi đi — không dựa vào helper tạo lại phiên (che mất "bị đá → 401").
// Kết thúc bằng sessionMoi(salesA) để các kịch bản sau (cùng D1 tạm) có phiên sống.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, login, sessionMoi, sqlRows } from "./lib.mjs";

const A = ACCOUNTS.salesA;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
/** Đăng nhập salesA từ một "máy" (User-Agent riêng); trả cookie phiên mới. */
async function dangNhapMay(ua, ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "user-agent": ua, "cf-connecting-ip": ip },
    body: JSON.stringify({ phone: A.phone, pin: A.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
  });
  assert.equal(r.status, 200, `đăng nhập ${r.status}`);
  return r.headers.get("set-cookie").split(";")[0];
}
const staffId = async () => (await sqlRows(`SELECT id FROM staff WHERE phone = '${A.phone}'`))[0].id;
const dongPhien = (id) => sqlRows(`SELECT id, end_reason, ended_at, device_label FROM aut_session WHERE staff_id = '${id}' ORDER BY created_at DESC, rowid DESC`);

// 1. Đăng xuất kết thúc dòng phiên; cookie đã chép đi nơi khác hết dùng được
const c0 = (await login(A.phone, A.pin)).cookie;
const id = await staffId();
assert.equal((await call(c0, "GET", "/api/auth/me")).status, 200);
let r = await call(c0, "POST", "/api/auth/logout");
assert.equal(r.status, 200);
assert.equal((await dongPhien(id))[0].end_reason, "dang_xuat");
assert.equal((await call(c0, "GET", "/api/auth/me")).status, 401, "cookie cũ sau đăng xuất bị từ chối (không còn dùng được 7 ngày)");
r = await call(c0, "POST", "/api/auth/session-ended");
assert.equal(r.body.reason, "Đã đăng xuất");
console.log("✓ đăng xuất kết thúc dòng phiên (dang_xuat), cookie cũ → 401, session-ended báo 'Đã đăng xuất'");

// 2. Đăng xuất không cookie / cookie rác: vẫn 200, không đụng dòng nào
const truoc = JSON.stringify(await dongPhien(id));
r = await call(null, "POST", "/api/auth/logout");
assert.equal(r.status, 200);
r = await call("td_session=rac.rac.rac.rac", "POST", "/api/auth/logout");
assert.equal(r.status, 200);
assert.equal(JSON.stringify(await dongPhien(id)), truoc);
console.log("✓ đăng xuất không cookie / cookie rác: 200, sổ phiên không đổi");

// 3. P16 — máy 2 đăng nhập đá máy 1 MÀ KHÔNG đổi thông tin đăng nhập: máy 1 bị 401 chỉ nhờ máy chủ kiểm dòng phiên
const m1 = await dangNhapMay(IPHONE);
assert.equal((await call(m1, "GET", "/api/auth/me")).status, 200, "máy 1 sống trước khi máy 2 vào");
const m2 = await dangNhapMay(WINDOWS);
assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200, "máy 2 sống");
assert.equal((await call(m1, "GET", "/api/auth/me")).status, 401, "máy 1 bị đá → 401 (chỉ nhờ kiểm dòng aut_session)");
const [moi, cu] = await dongPhien(id);
assert.equal(moi.end_reason, null);
assert.equal(moi.device_label, "Máy Windows · Chrome");
assert.equal(cu.end_reason, "bi_thay");
assert.equal(cu.device_label, "iPhone · Safari");
console.log("✓ máy 2 đăng nhập → máy 1 bị đá (bi_thay), 401, không đổi PIN/credentials_changed_at");

// 4. Lời báo lý do cho máy bị đá
r = await call(m1, "POST", "/api/auth/session-ended");
assert.equal(r.status, 200);
assert.equal(r.body.reason, "Bị thay bởi máy khác");
assert.ok(typeof r.body.endedAt === "string" && !Number.isNaN(Date.parse(r.body.endedAt)) && r.body.endedAt.endsWith("Z"), `endedAt ISO: ${r.body.endedAt}`);
r = await call(m2, "POST", "/api/auth/session-ended"); // máy đang sống: chưa kết thúc → không có lý do
assert.deepEqual(r.body, { reason: null, endedAt: null });
for (const ck of [null, "td_session=rac", `td_session=${m1.slice(0, -3)}AAA`]) { // không cookie / token rác / chữ ký sai → không lộ gì
  r = await call(ck, "POST", "/api/auth/session-ended");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { reason: null, endedAt: null }, `cookie ${ck} không được lộ lý do`);
}
console.log("✓ session-ended: máy bị đá nhận 'Bị thay bởi máy khác' + ISO; máy sống / token rác / sai chữ ký → rỗng");

// 5. Đăng xuất máy 2 → lý do 'Đã đăng xuất'; đăng xuất lại máy 1 (đã bị đá) không ghi đè lý do
await call(m2, "POST", "/api/auth/logout");
assert.equal((await call(m2, "POST", "/api/auth/session-ended")).body.reason, "Đã đăng xuất");
await call(m1, "POST", "/api/auth/logout");
assert.equal((await call(m1, "POST", "/api/auth/session-ended")).body.reason, "Bị thay bởi máy khác", "đăng xuất lần nữa không ghi đè lý do đã có");
console.log("✓ đăng xuất không ghi đè lý do kết thúc có sẵn");

// 6. Header cf-connecting-ip quá dài không làm đăng nhập 500 (cột ip ≤ 64)
const dai = await fetch(`${BASE}/api/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json", origin: BASE, "cf-connecting-ip": "9".repeat(300) },
  body: JSON.stringify({ phone: A.phone, pin: A.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
});
assert.notEqual(dai.status, 500, "IP quá dài không được gây 500");
console.log(`✓ cf-connecting-ip 300 ký tự: đăng nhập trả ${dai.status}, không 500`);

await sessionMoi(A);
console.log("phien.mjs: xong");
