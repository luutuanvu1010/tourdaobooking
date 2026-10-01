// E2E sổ phiên đăng nhập, phần đăng xuất + lời báo lý do (ADR-0075, Task 4) và đổi thông tin đăng nhập kết thúc phiên trong cùng lô (Task 5, điều 4–5). Dùng salesA (chịu luật một máy); cookie lấy TƯỜNG MINH từ đăng nhập
// và gửi đi — không dựa vào helper tạo lại phiên (che mất "bị đá → 401").
// Kết thúc bằng sessionMoi(salesA) để các kịch bản sau (cùng D1 tạm) có phiên sống.
import assert from "node:assert/strict";
import { ACCOUNTS, BASE, call, freshIp, login, randomPhone, session, sessionMoi, sqlRows } from "./lib.mjs";
import { createFakeAuthenticator } from "./fake-authenticator.mjs";
import { randomUUID } from "node:crypto";

const A = ACCOUNTS.salesA;
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36";
/** Đăng nhập (mặc định salesA) từ một "máy" (User-Agent riêng); trả cookie phiên mới. */
async function dangNhapMay(ua, ip = `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`, tk = A) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: BASE, "user-agent": ua, "cf-connecting-ip": ip },
    body: JSON.stringify({ phone: tk.phone, pin: tk.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
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

// ---- Task 5 (ADR-0075 điều 4–5): đổi thông tin đăng nhập kết thúc phiên TRONG CÙNG LÔ --------------------------------------------------------
// Toàn quyền (superAdmin) được miễn luật một máy → hai máy cùng sống thật; "máy 2 bị 401" chỉ có thể do lô đổi PIN / gỡ Face ID kết thúc dòng phiên
// (không phải do đăng nhập máy sau đá máy trước). Cookie lấy tường minh; PIN của superAdmin / salesA được trả về giá trị gốc ở `finally`.
const SA = ACCOUNTS.superAdmin;
const saId = (await sqlRows(`SELECT id FROM staff WHERE phone = '${SA.phone}'`))[0].id;
const dongCua = (sid) => sqlRows(`SELECT end_reason, ended_by, ended_at, last_seen_at FROM aut_session WHERE id = '${sid}'`).then((x) => x[0]);
/** Mã phiên trong cookie `td_session=staffId.iat.mãPhiên.chữKý`. */
const maPhien = (ck) => ck.split("=")[1].split(".")[2];
const credMs = async (sid) => (await sqlRows(`SELECT credentials_changed_at AS c FROM staff WHERE id = '${sid}'`))[0].c;
const RP = { rpId: new URL(BASE).hostname, origin: new URL(BASE).origin };
const cookieOf = (res, name) => {
  const all = res.headers.getSetCookie?.() ?? [res.headers.get("set-cookie") ?? ""];
  const c = all.find((x) => x.startsWith(`${name}=`) && !x.startsWith(`${name}=;`));
  return c ? c.split(";")[0] : null;
};
async function batFaceId(ck, pin) {
  const auth = await createFakeAuthenticator(RP);
  const opt = await call(ck, "POST", "/api/account/passkeys/options", { pin });
  assert.equal(opt.status, 200, JSON.stringify(opt.body));
  const cred = await auth.register(opt.body.publicKey.challenge, { userHandle: opt.body.publicKey.user.id });
  const r2 = await call(`${ck}; ${cookieOf(opt, "td_webauthn")}`, "POST", "/api/account/passkeys", { credential: cred });
  assert.equal(r2.status, 201, JSON.stringify(r2.body));
  return { auth, id: r2.body.passkey.id };
}
/** Máy 1 (đang thao tác) giữ phiên + nhận cookie cấp lại; máy 2 bị 401 với lý do `lyDo`; phiên giữ có last_seen_at ≥ credentials_changed_at (màn sổ phiên không coi là chết). */
async function kiemGiuMotMay(m1, m1Moi, m2, lyDo, coDoiCred = true) {
  assert.ok(m1Moi, "máy đang thao tác phải nhận cookie cấp lại");
  assert.equal(maPhien(m1Moi), maPhien(m1), "cấp lại cookie GIỮ mã phiên (ADR-0075 điều 5)");
  assert.equal((await call(m1Moi, "GET", "/api/auth/me")).status, 200, "máy đang thao tác vẫn 200");
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 401, "máy khác 401");
  const d2 = await dongCua(maPhien(m2));
  assert.equal(d2.end_reason, lyDo);
  assert.equal(d2.ended_by, saId);
  const d1 = await dongCua(maPhien(m1));
  assert.equal(d1.ended_at, null, "phiên đang thao tác không bị kết thúc");
  if (coDoiCred) assert.ok(Date.parse(d1.last_seen_at) >= (await credMs(saId)), `last_seen_at ${d1.last_seen_at} ≥ credentials_changed_at`);
}

let saPin = SA.pin;
try {
  // 7. Đổi PIN ở máy 1 → máy 2 bị kết thúc (doi_pin), máy 1 vẫn dùng được bằng cookie cấp lại
  let m1 = await dangNhapMay(IPHONE, undefined, SA);
  let m2 = await dangNhapMay(WINDOWS, undefined, SA);
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 200, "Toàn quyền miễn một máy: máy 1 còn sống khi máy 2 vào");
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200);
  r = await call(m1, "POST", "/api/account/change-pin", { currentPin: saPin, newPin: "583147" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  saPin = "583147";
  await kiemGiuMotMay(m1, r.cookie, m2, "doi_pin");
  m1 = r.cookie;
  console.log("✓ đổi PIN (Toàn quyền, hai máy): máy kia kết thúc 'doi_pin' trong cùng lô, máy đang thao tác giữ mã phiên, last_seen_at = mốc đổi");

  // 8. Gỡ MỘT Face ID của mình → máy khác kết thúc (doi_face_id); mã khoá không phải của mình → 404 và KHÔNG đá máy nào
  const k1 = await batFaceId(m1, saPin);
  m2 = await dangNhapMay(WINDOWS, undefined, { phone: SA.phone, pin: saPin });
  r = await call(m1, "DELETE", "/api/account/passkeys/00000000-0000-4000-8000-000000000000");
  assert.equal(r.status, 404);
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200, "gỡ khoá không tồn tại không được đăng xuất máy khác");
  r = await call(m1, "DELETE", `/api/account/passkeys/${k1.id}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  await kiemGiuMotMay(m1, r.cookie, m2, "doi_face_id");
  m1 = r.cookie;
  console.log("✓ gỡ một Face ID: máy kia kết thúc 'doi_face_id'; khoá không tồn tại → 404, không đá ai");

  // 9. Gỡ MỌI Face ID của mình
  await batFaceId(m1, saPin);
  m2 = await dangNhapMay(WINDOWS, undefined, { phone: SA.phone, pin: saPin });
  r = await call(m1, "POST", "/api/account/passkeys/remove-all", {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.removed, 1);
  await kiemGiuMotMay(m1, r.cookie, m2, "doi_face_id");
  m1 = r.cookie;
  console.log("✓ gỡ mọi Face ID: máy kia kết thúc 'doi_face_id', máy đang thao tác giữ phiên");

  // 10. Đặt PIN bằng Face ID
  const k3 = await batFaceId(m1, saPin);
  m2 = await dangNhapMay(WINDOWS, undefined, { phone: SA.phone, pin: saPin });
  const pOpt = await call(m1, "POST", "/api/account/pin-by-passkey/options", {});
  assert.equal(pOpt.status, 200, JSON.stringify(pOpt.body));
  const res = await fetch(`${BASE}/api/account/pin-by-passkey`, {
    method: "POST",
    headers: { cookie: `${m1}; ${cookieOf(pOpt, "td_webauthn")}`, "content-type": "application/json", origin: BASE, "cf-connecting-ip": freshIp() },
    body: JSON.stringify({ newPin: "592648", credential: await k3.auth.sign(pOpt.body.publicKey.challenge) }),
  });
  assert.equal(res.status, 200, await res.text());
  saPin = "592648";
  await kiemGiuMotMay(m1, cookieOf(res, "td_session"), m2, "doi_pin");
  m1 = cookieOf(res, "td_session");
  r = await call(m1, "POST", "/api/account/passkeys/remove-all", {}); // dọn khoá thử — gỡ được 1 khoá nên cookie được cấp lại (mốc mới), dùng tiếp cookie đó
  assert.equal(r.status, 200, JSON.stringify(r.body));
  m1 = r.cookie;
  console.log("✓ đặt PIN bằng Face ID: máy kia kết thúc 'doi_pin', máy đang thao tác giữ phiên");

  // 10b. Ruling Task 5: gỡ mọi Face ID khi KHÔNG còn khoá nào → không đổi gì, KHÔNG kết thúc phiên nào (tự phục vụ lẫn Quản trị)
  m2 = await dangNhapMay(WINDOWS, undefined, { phone: SA.phone, pin: saPin });
  r = await call(m1, "POST", "/api/account/passkeys/remove-all", {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.removed, 0);
  assert.equal(r.cookie, null, "không gỡ gì thì không cấp lại cookie");
  assert.equal((await call(m2, "GET", "/api/auth/me")).status, 200, "không còn khoá: máy khác vẫn sống");
  assert.equal((await dongCua(maPhien(m2))).ended_at, null);
  assert.equal((await call(m1, "GET", "/api/auth/me")).status, 200);
  const ADMIN0 = await session(ACCOUNTS.admin);
  const sA0 = await dangNhapMay(IPHONE);
  r = await call(ADMIN0, "POST", `/api/staff/${id}/passkeys/remove-all`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(sA0, "GET", "/api/auth/me")).status, 200, "Quản trị gỡ Face ID của tài khoản không có khoá: phiên vẫn sống");
  assert.equal((await dongCua(maPhien(sA0))).ended_at, null);
  console.log("✓ gỡ mọi Face ID khi không còn khoá nào (tự phục vụ / Quản trị): không phiên nào bị kết thúc");

  // 11. Quản trị đặt lại PIN cho salesA → mọi phiên của salesA kết thúc 'dat_lai_pin', ended_by = Quản trị
  const ADMIN = await session(ACCOUNTS.admin);
  const adminId = (await call(ADMIN, "GET", "/api/auth/me")).body.staff.id;
  const sA = await dangNhapMay(IPHONE);
  r = await call(ADMIN, "POST", `/api/staff/${id}/reset-pin`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const pinMoiA = r.body.pin;
  assert.equal((await call(sA, "GET", "/api/auth/me")).status, 401);
  const dA = await dongCua(maPhien(sA));
  assert.equal(dA.end_reason, "dat_lai_pin");
  assert.equal(dA.ended_by, adminId);
  assert.equal((await sqlRows(`SELECT count(*) AS n FROM aut_session WHERE staff_id = '${id}' AND ended_at IS NULL`))[0].n, 0, "không còn phiên sống nào của salesA");
  // trả PIN gốc cho salesA (kịch bản sau dùng ACCOUNTS.salesA.pin)
  const sA2 = await dangNhapMay(IPHONE, undefined, { phone: A.phone, pin: pinMoiA });
  r = await call(sA2, "POST", "/api/account/change-pin", { currentPin: pinMoiA, newPin: A.pin });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ Quản trị đặt lại PIN: mọi phiên của tài khoản kết thúc 'dat_lai_pin', ended_by = Quản trị");
} finally {
  // trả PIN gốc cho superAdmin (passkey.mjs và kịch bản sau đăng nhập bằng ACCOUNTS.superAdmin.pin)
  if (saPin !== SA.pin) {
    const ck = await dangNhapMay(WINDOWS, undefined, { phone: SA.phone, pin: saPin });
    const back = await call(ck, "POST", "/api/account/change-pin", { currentPin: saPin, newPin: SA.pin });
    assert.equal(back.status, 200, `trả PIN gốc superAdmin: ${JSON.stringify(back.body)}`);
  }
}
// ---- Task 6 (ADR-0075 điều 6b): máy bị thay không còn nhận thông báo màn hình khoá -----------------------------------------------------------
// Tắt máy chạy bắn-và-quên (waitUntil) sau phản hồi đăng nhập → đợi dòng đổi (tối đa vài giây), không assert ngay.
const diaChiGia = () => `https://fcm.googleapis.com/fcm/send/e2e-phien-${randomUUID()}`;
const dongMay = async (ep) => (await sqlRows(`SELECT session_id, revoked_at, revoke_reason FROM ntf_push_sub WHERE endpoint = '${ep}' ORDER BY created_at DESC, rowid DESC`))[0];
async function doiTat(ep, ms = 5000) {
  const het = Date.now() + ms;
  for (;;) {
    const d = await dongMay(ep);
    if (d?.revoked_at) return d;
    if (Date.now() > het) return d;
    await new Promise((res) => setTimeout(res, 100));
  }
}
const batMay = async (ck, ep) => assert.equal((await call(ck, "POST", "/api/account/thong-bao/may", { endpoint: ep, thietBi: "Máy thử" })).status, 200);
{
  // 12. salesA đăng ký máy 1 → đăng ký mang mã phiên; máy 2 đăng nhập → đăng ký của máy 1 tắt, lý do bi-thay
  const c1 = await dangNhapMay(IPHONE);
  const ep1 = diaChiGia();
  await batMay(c1, ep1);
  assert.equal((await dongMay(ep1)).session_id, maPhien(c1), "đăng ký máy ghi mã phiên đang đăng nhập");
  const c2 = await dangNhapMay(WINDOWS);
  let d = await doiTat(ep1);
  assert.ok(d.revoked_at, "máy 1 bị thay → đăng ký thông báo của nó phải tắt");
  assert.equal(d.revoke_reason, "bi-thay");
  console.log("✓ máy 2 đăng nhập → đăng ký thông báo của máy 1 tắt (bi-thay)");

  // 13. KHÔNG phiên nào bị thay (máy 2 đã đăng xuất, không gọi /huy) → lần đăng nhập sau vẫn tắt đăng ký cũ của tài khoản
  const ep2 = diaChiGia();
  await batMay(c2, ep2);
  assert.equal((await call(c2, "POST", "/api/auth/logout")).status, 200);
  assert.equal((await dongMay(ep2)).revoked_at, null, "đăng xuất (route công khai) không đụng đăng ký thông báo");
  const c3 = await dangNhapMay(IPHONE);
  d = await doiTat(ep2);
  assert.ok(d.revoked_at, "đăng nhập khi không còn phiên sống vẫn phải tắt đăng ký cũ của tài khoản");
  assert.equal(d.revoke_reason, "bi-thay");
  // Máy mới đăng ký lại cùng địa chỉ (web/shell.ts làm sau đăng nhập) → dòng đang bật mang phiên mới
  await batMay(c3, ep2);
  const moi = await dongMay(ep2);
  assert.equal(moi.revoked_at, null);
  assert.equal(moi.session_id, maPhien(c3));
  console.log("✓ đăng nhập khi không phiên nào bị thay vẫn tắt đăng ký cũ; đăng ký lại → dòng mới mang phiên mới");

  // 14. Toàn quyền (miễn một máy): đăng ký cùng máy bằng phiên mới → cập nhật mã phiên, không thêm máy; đăng nhập máy khác không tắt gì
  const s1 = await dangNhapMay(IPHONE, undefined, SA);
  const ep3 = diaChiGia();
  await batMay(s1, ep3);
  const soMay = (await call(s1, "GET", "/api/account/thong-bao/may")).body.soMay;
  const s2 = await dangNhapMay(WINDOWS, undefined, SA);
  await batMay(s2, ep3);
  assert.equal((await call(s2, "GET", "/api/account/thong-bao/may")).body.soMay, soMay, "đăng ký lại cùng máy không thêm máy");
  await new Promise((res) => setTimeout(res, 500));
  const d3 = await dongMay(ep3);
  assert.equal(d3.revoked_at, null, "Toàn quyền đăng nhập máy khác không tắt thông báo");
  assert.equal(d3.session_id, maPhien(s2), "đăng ký lại bằng phiên mới cập nhật mã phiên");
  await call(s2, "POST", "/api/account/thong-bao/may/huy", { endpoint: ep3 }); // dọn
  console.log("✓ Toàn quyền: đăng ký lại cùng máy bằng phiên mới cập nhật mã phiên, không tắt máy nào");
}

// ---- Task 7 (ADR-0075 điều 7–8): xem / gỡ phiên — chỉ Toàn quyền; nhật ký im lặng session_revoked ----------------------------------------------
{
  const sa = await dangNhapMay(WINDOWS, undefined, SA); // Toàn quyền miễn một máy: không đá phiên Toàn quyền nào khác
  const adm = await session(ACCOUNTS.admin);
  const hr = await session(ACCOUNTS.hr);
  const cA = await dangNhapMay(IPHONE); // salesA — máy sẽ bị gỡ; cookie lấy TƯỜNG MINH
  const sidA = maPhien(cA);
  assert.equal((await call(cA, "GET", "/api/auth/me")).status, 200);

  // 15. Quản trị (không Toàn quyền) và Nhân sự → 403 ở cả hai route; phiên không bị đụng
  for (const [ten, ck] of [["Quản trị", adm], ["Nhân sự", hr]]) {
    assert.equal((await call(ck, "GET", "/api/sessions")).status, 403, `${ten} xem sổ phiên → 403`);
    assert.equal((await call(ck, "POST", `/api/sessions/${sidA}/revoke`, {})).status, 403, `${ten} gỡ phiên → 403`);
  }
  assert.equal((await call(cA, "GET", "/api/auth/me")).status, 200, "403 không đá máy nào");
  console.log("✓ Quản trị / Nhân sự: GET /api/sessions và POST …/revoke → 403");

  // 16. Lịch sử của chính mình: chỉ dòng của mình, máy này có thisDevice, không User-Agent thô
  r = await call(cA, "GET", "/api/account/sessions");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const ids = new Set((await sqlRows(`SELECT id FROM aut_session WHERE staff_id = '${id}'`)).map((x) => x.id));
  assert.ok(r.body.sessions.length > 0 && r.body.sessions.every((s) => ids.has(s.id)), "chỉ phiên của salesA");
  assert.equal(r.body.sessions.filter((s) => s.thisDevice).map((s) => s.id).join(), sidA);
  assert.ok(!JSON.stringify(r.body).includes("Mozilla"), "không trả User-Agent thô");
  console.log("✓ GET /api/account/sessions: chỉ phiên của mình, đánh dấu máy này, không User-Agent thô");

  // 17. Toàn quyền xem sổ phiên lọc theo salesA + đang hiệu lực, rồi gỡ → salesA 401, lý do 'Bị IT/Toàn quyền gỡ'
  r = await call(sa, "GET", `/api/sessions?staffId=${id}&live=1`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.sessions.map((s) => s.id), [sidA], "salesA có đúng một phiên sống");
  assert.equal(r.body.sessions[0].staffName, A.name);
  assert.equal(r.body.sessions[0].statusLabel, "Đang hiệu lực");
  // ADR-0075 điều 6b: máy bị gỡ có đăng ký thông báo → đăng ký đó tắt (bi-go). Máy Toàn quyền của `sa` (tài khoản khác) không đụng.
  const epA = diaChiGia();
  await batMay(cA, epA);
  const epSa = diaChiGia();
  await batMay(sa, epSa);
  r = await call(sa, "POST", `/api/sessions/${sidA}/revoke`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(cA, "GET", "/api/auth/me")).status, 401, "máy bị gỡ → 401");
  const dgA = await doiTat(epA);
  assert.ok(dgA.revoked_at, "máy bị gỡ → đăng ký thông báo của nó phải tắt");
  assert.equal(dgA.revoke_reason, "bi-go");
  assert.equal((await dongMay(epSa)).revoked_at, null, "đăng ký của tài khoản khác không đụng");
  // Cùng tài khoản nhiều máy (Toàn quyền miễn một máy): gỡ phiên máy thứ hai của superAdmin → chỉ đăng ký của máy đó tắt; máy `sa` vẫn bật, vẫn đăng nhập.
  const saMay2 = await dangNhapMay(IPHONE, undefined, SA);
  const epSa2 = diaChiGia();
  await batMay(saMay2, epSa2);
  r = await call(sa, "POST", `/api/sessions/${maPhien(saMay2)}/revoke`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const dgSa2 = await doiTat(epSa2);
  assert.equal(dgSa2.revoke_reason, "bi-go", "máy bị gỡ → đăng ký tắt, lý do bi-go");
  await new Promise((res) => setTimeout(res, 300));
  assert.equal((await dongMay(epSa)).revoked_at, null, "máy kia của CÙNG tài khoản vẫn nhận thông báo (ADR-0075 điều 6b — chỉ máy bị gỡ)");
  assert.equal((await call(sa, "GET", "/api/auth/me")).status, 200, "máy kia vẫn đăng nhập");
  await call(sa, "POST", "/api/account/thong-bao/may/huy", { endpoint: epSa }); // dọn
  assert.equal((await call(cA, "POST", "/api/auth/session-ended")).body.reason, "Bị IT/Toàn quyền gỡ");
  const dg = await dongCua(sidA);
  assert.equal(dg.end_reason, "bi_go");
  assert.equal(dg.ended_by, saId);
  assert.equal((await call(sa, "POST", `/api/sessions/${sidA}/revoke`, {})).status, 409, "gỡ lần nữa → 409");
  r = await call(sa, "POST", `/api/sessions/${maPhien(sa)}/revoke`, {});
  assert.equal(r.status, 409, "tự gỡ phiên của mình → 409");
  assert.equal(r.body.error.code, "self_session");
  console.log("✓ Toàn quyền gỡ phiên salesA: 401 + 'Bị IT/Toàn quyền gỡ'; gỡ lại / tự gỡ → 409; chỉ đăng ký thông báo của máy bị gỡ tắt (bi-go)");

  // 18. Nhật ký im lặng: một dòng session_revoked không IP; Quản trị không mở được trang Nhật ký (audit.view chỉ Toàn quyền — ADR-0038 điều 6, nên
  // lớp lọc im lặng không có người xem không-Toàn-quyền nào ở e2e; bộ lọc được kiểm ở src/modules/audit/an-toan-quyen.test.ts); Toàn quyền thấy dòng.
  const nk = await sqlRows(`SELECT staff_id, target_id, detail FROM audit_log WHERE action = 'session_revoked' AND detail LIKE '%${sidA}%'`);
  assert.equal(nk.length, 1);
  assert.equal(nk[0].staff_id, saId);
  assert.equal(nk[0].target_id, id);
  assert.ok(!/\d+\.\d+\.\d+\.\d+|Mozilla/.test(nk[0].detail), "nhật ký không có IP / User-Agent");
  assert.equal((await call(adm, "GET", "/api/audit?action=session_revoked&limit=50")).status, 403, "Quản trị không xem được Nhật ký");
  r = await call(sa, "GET", "/api/audit?action=session_revoked&limit=50");
  assert.equal(r.status, 200);
  assert.ok(r.body.entries.some((e) => e.targetId === id), "Toàn quyền thấy dòng session_revoked");
  console.log("✓ nhật ký session_revoked: một dòng, không IP; Quản trị 403 ở trang Nhật ký, Toàn quyền thấy");
}

// ---- Task 8 (ADR-0075 điều 3): mất miễn luật một máy → còn phiên mới nhất -----------------------------------------------------------------------------
// KHÔNG hạ quyền superAdmin dùng chung (nhóm e2e khác chạy song song cần nó): superAdmin tạo một tài khoản Toàn quyền THỬ, đăng nhập 2 máy (cookie tường minh),
// rồi bỏ Toàn quyền của tài khoản đó. Cuối cùng ngưng tài khoản thử.
{
  const sa = await dangNhapMay(WINDOWS, undefined, SA);
  const phone = randomPhone();
  r = await call(sa, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Toàn Quyền Thử Mất Miễn", phone, permissions: ["SUPER_ADMIN"] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const tk = { phone, pin: r.body.pin };
  const tid = r.body.staff.id;
  const may1 = await dangNhapMay(IPHONE, undefined, tk);
  await new Promise((ok) => setTimeout(ok, 5)); // created_at khác nhau: máy 2 là phiên mới nhất
  const may2 = await dangNhapMay(WINDOWS, undefined, tk);
  for (const ck of [may1, may2]) assert.equal((await call(ck, "GET", "/api/auth/me")).status, 200, "Toàn quyền: hai máy cùng sống");
  r = await call(sa, "PUT", `/api/staff/${tid}/permissions`, { permissions: ["SALES"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const song = await sqlRows(`SELECT id, single FROM aut_session WHERE staff_id = '${tid}' AND ended_at IS NULL`);
  assert.deepEqual(song.map((x) => ({ id: x.id, single: x.single })), [{ id: maPhien(may2), single: 1 }], "còn đúng phiên mới nhất, chịu luật một máy");
  assert.equal((await call(may1, "GET", "/api/auth/me")).status, 401, "máy cũ bị đăng xuất");
  assert.equal((await call(may2, "GET", "/api/auth/me")).status, 200, "máy mới nhất còn dùng được");
  assert.equal((await call(may1, "POST", "/api/auth/session-ended")).body.reason, "Không còn quyền dùng nhiều máy");
  const d1 = await dongCua(maPhien(may1));
  assert.equal(d1.end_reason, "mat_mien");
  assert.equal(d1.ended_by, saId);
  // Đăng nhập máy 3 → nay chịu luật một máy: máy 2 bị thay
  const may3 = await dangNhapMay(IPHONE, undefined, tk);
  assert.equal((await call(may2, "GET", "/api/auth/me")).status, 401, "sau khi mất miễn: máy mới đá máy cũ");
  assert.equal((await call(may3, "GET", "/api/auth/me")).status, 200);
  assert.equal((await call(sa, "PATCH", `/api/staff/${tid}`, { active: false })).status, 200);
  console.log("✓ bỏ Toàn quyền của tài khoản đang mở 2 máy → còn phiên mới nhất (single=1), máy cũ 401 'Không còn quyền dùng nhiều máy'; máy sau đá máy trước");
}

// ---- Task 9 (Review Focus 4): hai lần đăng nhập ĐỒNG THỜI cùng tài khoản thường → đúng MỘT phiên sống, lần thua lỗi sạch (không 500) --------------------
// Tài khoản SALES THỬ riêng (không đụng salesA dùng chung với nhóm e2e khác). Không đòi phải có 409: D1 xếp hàng các lô nên thường cả hai đều 200 (lần sau đá
// lần trước) — điều phải giữ là sau mỗi vòng còn đúng một dòng `ended_at IS NULL`, và không lần nào 500.
{
  const sa = await dangNhapMay(WINDOWS, undefined, SA);
  const phone = randomPhone();
  r = await call(sa, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Bán Hàng Thử Chạy Đua", phone, permissions: ["SALES"] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const tk = { phone, pin: r.body.pin };
  const tid = r.body.staff.id;
  const trangThai = [];
  for (let vong = 0; vong < 5; vong++) {
    const kq = await Promise.all([0, 1].map((k) =>
      fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json", origin: BASE, "user-agent": k ? IPHONE : WINDOWS, "cf-connecting-ip": freshIp() },
        body: JSON.stringify({ phone: tk.phone, pin: tk.pin, turnstileToken: "XXXX.DUMMY.TOKEN.XXXX" }),
      }).then(async (x) => ({ status: x.status, body: await x.json().catch(() => null), cookie: x.headers.get("set-cookie")?.split(";")[0] ?? null }))));
    for (const x of kq) {
      trangThai.push(x.status);
      assert.ok(x.status === 200 || x.status === 409, `vòng ${vong}: trạng thái ${x.status} ${JSON.stringify(x.body)} (không được 500)`);
    }
    assert.ok(kq.some((x) => x.status === 200), `vòng ${vong}: ít nhất một lần đăng nhập thành công`);
    const song = await sqlRows(`SELECT id FROM aut_session WHERE staff_id = '${tid}' AND ended_at IS NULL`);
    assert.equal(song.length, 1, `vòng ${vong}: đúng một phiên sống, có ${song.length}`);
    const meSong = await Promise.all(kq.filter((x) => x.cookie).map((x) => call(x.cookie, "GET", "/api/auth/me").then((m) => m.status)));
    assert.equal(meSong.filter((s) => s === 200).length, 1, `vòng ${vong}: đúng một cookie còn dùng được (${JSON.stringify(meSong)})`);
  }
  assert.equal((await call(sa, "PATCH", `/api/staff/${tid}`, { active: false })).status, 200);
  console.log(`✓ chạy đua: 5 vòng × 2 lần đăng nhập đồng thời cùng tài khoản thường → mỗi vòng đúng một phiên sống, một cookie dùng được; trạng thái ${JSON.stringify(trangThai)} (không 500)`);
}

await sessionMoi(SA);
await sessionMoi(A);
console.log("phien.mjs: xong");
