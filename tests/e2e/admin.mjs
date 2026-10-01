import assert from "node:assert/strict";
import { ACCOUNTS, call as raw, freshIp as fresh, login, randomPhone as rnd, session, sessionMoi } from "./lib.mjs";

const cookieOf = (r) => r.cookie;

let ADMIN = await session(ACCOUNTS.admin); // `let`: ca DK-T3-02 đăng nhập lại tài khoản Quản trị (luật một máy đá cookie cũ) rồi lấy cookie mới
const SALES = await session(ACCOUNTS.salesA);
const SUPER_ADMIN = await session(ACCOUNTS.superAdmin);
// ADR-0071: Hành chính nhân sự tạo tài khoản; Quản trị chỉ sửa / ngưng / hỗ trợ đăng nhập cho cấp dưới.
const HR = await session(ACCOUNTS.hr);

// --- phân quyền API
assert.equal((await raw(null, "GET", "/api/staff")).status, 401);
assert.equal((await raw(SALES, "GET", "/api/staff")).status, 403);
assert.equal((await raw(SALES, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "X", phone: rnd() })).status, 403);
assert.equal((await raw(SALES, "PUT", "/api/staff/00000000-0000-0000-0000-000000000000/permissions", { permissions: ["ADMIN"] })).status, 403, "sales không tự cấp quyền");
assert.equal((await raw(ADMIN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Quản Trị Tạo", phone: rnd(), roles: ["SALES_STAFF"] })).status, 403, "ADR-0071 điều 1b: Quản trị không tạo tài khoản");

// --- tạo nhân viên
// D-02 (ADR-0014 điều 7): trường permissions HOÀN TOÀN VẮNG MẶT → không quyền nào (trước đây tự động Bán hàng).
const noPermsPhone = rnd();
const noPerms = await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Không Quyền", phone: noPermsPhone });
assert.equal(noPerms.status, 201, JSON.stringify(noPerms.body));
assert.deepEqual(noPerms.body.staff.permissions, []);
// Không để tài khoản không quyền nằm lại "đang hoạt động" cho hết bài kiểm (audit-invariants --strict coi đó là điều cần rà soát, đúng ý — không phải lỗi ở đây, chỉ là dữ liệu thử).
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${noPerms.body.staff.id}`, { active: false })).status, 200);

const phoneA = rnd();
let r = await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "  Nguyễn   Test Một ", phone: phoneA.replace(/^0/, "+84 "), permissions: ["SALES"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, phoneA); assert.equal(r.body.staff.fullName, "Nguyễn Test Một"); assert.deepEqual(r.body.staff.permissions, ["SALES"]);
assert.ok(r.body.staff.partyId, "tài khoản mới phải có hồ sơ");
assert.match(r.body.pin, /^\d{6}$/);
const A = { id: r.body.staff.id, pin: r.body.pin, phone: phoneA, partyId: r.body.staff.partyId };
assert.equal((await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Trùng", phone: phoneA })).status, 409);
assert.equal((await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Sai", phone: "123" })).status, 400);
// Tên vượt giới hạn của hồ sơ (CHECK pty_person 60/100/60) phải bị chặn ở ĐẦU VÀO = 400, không để db.batch() vỡ = 500.
assert.equal((await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${"A".repeat(65)} Văn Nam`, phone: rnd() })).status, 400, "từ đầu 65 ký tự → 400 chứ không 500");
assert.equal((await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: Array(25).fill("Nguyen").join(" "), phone: rnd() })).status, 400, "nhiều từ dồn vào tên đệm → 400 chứ không 500");
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { fullName: `Nguyễn Văn ${"A".repeat(65)}` })).status, 400, "đổi tên quá dài → 400 chứ không 500");
for (const bad of [["BOSS"], [], "SALES", ["SALES", "sales"], [1]]) assert.equal((await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Sai quyền", phone: rnd(), permissions: bad })).status, 400, JSON.stringify(bad));
// "Đăng nhập gần nhất" (staff.last_login_at, migration 0015): NULL cho tới lần đăng nhập THÀNH CÔNG đầu tiên
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const lastLoginOf = async (id) => (await raw(ADMIN, "GET", "/api/staff")).body.staff.find((s) => s.id === id).lastLoginAt;
assert.equal(await lastLoginOf(A.id), null, "tài khoản mới chưa đăng nhập → lastLoginAt null");
r = await login(A.phone, A.pin); assert.equal(r.status, 200);
const A_COOKIE = cookieOf(r);
const firstLogin = await lastLoginOf(A.id);
assert.match(firstLogin, ISO, "sau đăng nhập đúng: chuỗi ISO UTC");
assert.ok(Math.abs(Date.now() - Date.parse(firstLogin)) < 120_000, `mốc đăng nhập phải gần bây giờ: ${firstLogin}`);
assert.equal((await login(A.phone, "000111")).status, 401);
assert.equal(await lastLoginOf(A.id), firstLogin, "đăng nhập SAI PIN không đổi lastLoginAt");
const adminId = (await raw(ADMIN, "GET", "/api/auth/me")).body.staff.id;
assert.match(await lastLoginOf(adminId), ISO, "tài khoản đã đăng nhập ở đầu kịch bản cũng có lastLoginAt");
console.log("✓ lastLoginAt: null khi chưa đăng nhập, ISO sau đăng nhập đúng, sai PIN không đổi");
console.log("✓ tạo + đăng nhập bằng PIN sinh ra");

// --- nhật ký: có dòng không gắn đơn (LEFT JOIN), KHÔNG chứa PIN
// hồ sơ nhân sự: có hồ sơ PERSON với tên tách đúng, vai trò hồ sơ STAFF, KHÔNG có liên hệ (SĐT đăng nhập ≠ SĐT liên hệ — ADR-0001 mục 5)
r = await raw(ADMIN, "GET", `/api/parties/${A.partyId}`);
assert.equal(r.status, 200);
assert.equal(r.body.party.kind, "PERSON"); assert.equal(r.body.party.displayName, "Nguyễn Test Một");
assert.equal(r.body.party.familyName, "Nguyễn"); assert.equal(r.body.party.middleName, "Test"); assert.equal(r.body.party.givenName, "Một");
assert.deepEqual(r.body.party.roleCodes, ["STAFF"]); assert.deepEqual(r.body.party.contacts, []);
console.log("✓ tài khoản mới có hồ sơ + vai trò STAFF, không sao chép SĐT");
assert.equal((await raw(ADMIN, "GET", "/api/audit?action=staff_created&limit=5")).status, 403, "ADR-0038 điều 6: trang Nhật ký chỉ Toàn quyền");
r = await raw(SUPER_ADMIN, "GET", "/api/audit?action=staff_created&limit=5");
assert.equal(r.status, 200);
const created = r.body.entries.find((e) => e.targetId === A.id);
assert.ok(created, "staff_created phải hiện trong /api/audit");
assert.equal(created.orderId, null); assert.equal(created.targetLabel, "Nguyễn Test Một");
assert.ok(!JSON.stringify(r.body).includes(A.pin), "PIN không được xuất hiện trong nhật ký");
console.log("✓ nhật ký hiển thị hành động không gắn đơn, không lộ PIN");

// --- sửa: đổi tên (= đổi tên hồ sơ), quyền, SĐT, ngưng
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { fullName: "Nguyễn Test Hai" });
assert.equal(r.status, 200); assert.equal(r.body.staff.fullName, "Nguyễn Test Hai");
assert.equal((await raw(ADMIN, "GET", `/api/parties/${r.body.staff.partyId}`)).body.party.displayName, "Nguyễn Test Hai", "đổi tên tài khoản = đổi tên hồ sơ");
// LC-4 (ADR-0018 điều 5): Quản trị KHÔNG còn cấp được quyền Quản trị — chỉ Toàn quyền. Sau khi A giữ ADMIN, Quản trị cũng không quản lý được A nữa (ADR-0014 điều 8).
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["ADMIN", "SALES"] })).status, 403, "Quản trị không cấp quyền Quản trị");
r = await raw(SUPER_ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["ADMIN", "SALES"] });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.staff.permissions, ["SALES", "ADMIN"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] })).status, 403, "Admin không còn quản lý được A sau khi A thành Admin");
r = await raw(SUPER_ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] });
assert.equal(r.status, 200, JSON.stringify(r.body)); assert.deepEqual(r.body.staff.permissions, ["SALES"]);
for (const bad of [[], ["BOSS"], "ADMIN", null]) assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: bad })).status, 400, JSON.stringify(bad));
assert.equal((await raw(ADMIN, "PUT", "/api/staff/khong-phai-id/permissions", { permissions: ["SALES"] })).status, 404);
// quyền có hiệu lực NGAY với phiên đang mở (getActiveStaff đọc quyền ở mỗi request)
assert.deepEqual((await raw(A_COOKIE, "GET", "/api/auth/me")).body.staff.permissions, ["SALES"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES", "ACCOUNTING"] })).status, 200);
assert.deepEqual((await raw(A_COOKIE, "GET", "/api/auth/me")).body.staff.permissions, ["SALES", "ACCOUNTING"]);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${A.id}/permissions`, { permissions: ["SALES"] })).status, 200);
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { phone: "0900000002" });
assert.equal(r.status, 409); // trùng SĐT người khác
// tự ngưng / tự hạ quyền bị chặn
const me = (await raw(ADMIN, "GET", "/api/auth/me")).body.staff;
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${me.id}`, { active: false })).status, 409);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${me.id}/permissions`, { permissions: ["SALES"] })).status, 409);
assert.equal((await raw(ADMIN, "PUT", `/api/staff/${me.id}/permissions`, { permissions: ["ADMIN", "SALES"] })).status, 409, "cũng không tự thêm quyền cho mình");
// ngưng → hiệu lực NGAY với phiên đang mở
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 200);
// đổi tên + ngưng trong CÙNG một PATCH: đường thắng phải đổi đủ (chuỗi điều kiện `changes() > 0` chạy trên D1 thật, không chỉ SQLite trong bộ nhớ)
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { fullName: "Nguyễn Test Ba", active: false });
assert.equal(r.status, 200); assert.equal(r.body.staff.fullName, "Nguyễn Test Ba", "PATCH đổi tên + ngưng: tên phải đổi");
assert.equal(r.body.staff.active, false);
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 401);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { active: true })).status, 200);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(SUPER_ADMIN, "GET", "/api/audit?q=Nguyễn Test&limit=20");
const actions = r.body.entries.filter((e) => e.targetId === A.id).map((e) => e.action);
for (const a of ["staff_created", "staff_updated", "permission_changed", "staff_suspended", "staff_reactivated"]) assert.ok(actions.includes(a), `thiếu ${a}: ${actions}`);
assert.ok(r.body.entries.some((e) => e.action === "permission_changed" && e.targetId === A.id && /Bán hàng/.test(e.detail)), "nhật ký đổi quyền có nhãn tiếng Việt");
console.log("✓ sửa/ngưng/kích hoạt, tự khoá bị chặn, ngưng có hiệu lực ngay, đủ nhật ký");

// --- DK-T3-02 (kiểm toán 2026-09-24): Quản trị/Toàn quyền KHÔNG tự đặt lại PIN của chính mình qua route quản trị — route đó không hỏi
// PIN cũ, nên một phiên bỏ quên sẽ bị chiếm hẳn (vượt bước nhập lại PIN của ADR-0016 điều 2a). Đổi PIN của mình chỉ ở trang Tôi (change-pin, có PIN hiện tại).
for (const [who, cookie, account] of [["Quản trị", ADMIN, ACCOUNTS.admin], ["Toàn quyền", SUPER_ADMIN, ACCOUNTS.superAdmin]]) {
  const selfId = (await raw(cookie, "GET", "/api/auth/me")).body.staff.id;
  r = await raw(cookie, "POST", `/api/staff/${selfId}/reset-pin`);
  assert.equal(r.status, 403, `${who} tự đặt lại PIN của mình phải bị chặn: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "forbidden");
  assert.match(r.body.error.message, /Đổi mã PIN/, "thông báo chỉ sang mục Đổi mã PIN ở trang Tôi");
  assert.equal(r.body.pin, undefined, "không được trả PIN mới");
  assert.equal((await raw(cookie, "GET", "/api/auth/me")).status, 200, `${who}: phiên đang mở vẫn hợp lệ (không có gì bị ghi)`);
  // PIN cũ vẫn đăng nhập được (sessionMoi ném lỗi nếu không 200). Luật một máy (ADR-0075): lần đăng nhập này đá cookie cũ của Quản trị — lấy lại ở dưới.
  await sessionMoi(account);
  r = await raw(SUPER_ADMIN, "GET", "/api/audit?action=pin_reset&limit=50");
  assert.ok(!r.body.entries.some((e) => e.targetId === selfId), `${who}: không có dòng nhật ký pin_reset cho chính mình`);
}
ADMIN = await session(ACCOUNTS.admin);
console.log("✓ DK-T3-02: Quản trị/Toàn quyền tự đặt lại PIN của mình → 403, phiên và PIN cũ giữ nguyên");

// --- đặt lại PIN thu hồi phiên cũ (cũng là vế "vẫn đặt lại được cho cấp dưới" của DK-T3-02: A đang chỉ có quyền Bán hàng)
const s1 = cookieOf(await login(A.phone, A.pin));
r = await raw(ADMIN, "POST", `/api/staff/${A.id}/reset-pin`); // ADR-0042: Quản trị đặt lại PIN cho cấp dưới
assert.equal(r.status, 200); assert.match(r.body.pin, /^\d{6}$/); assert.notEqual(r.body.pin, A.pin);
const oldPin = A.pin; A.pin = r.body.pin;
assert.equal((await raw(s1, "GET", "/api/auth/me")).status, 401, "phiên cũ phải bị thu hồi");
assert.equal((await login(A.phone, oldPin)).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(SUPER_ADMIN, "GET", "/api/audit?action=pin_reset&limit=3");
assert.ok(r.body.entries.some((e) => e.targetId === A.id));
assert.ok(!JSON.stringify(r.body).includes(A.pin));
console.log("✓ đặt lại PIN thu hồi phiên cũ, nhật ký không lộ PIN");

// --- đổi PIN của chính mình
// Luật một máy (ADR-0075): A chịu luật nên đăng nhập `sess` (SAU) đã đá `other` (bị thay); vế "đổi PIN đăng xuất máy khác" vẫn đúng.
const other = cookieOf(await login(A.phone, A.pin)); // thiết bị khác
let sess = cookieOf(await login(A.phone, A.pin));
const beforePinChange = await lastLoginOf(A.id);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: "000000", newPin: "482915" })).status, 403);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "123456" })).status, 400);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: A.pin })).status, 400);
r = await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "482915" });
assert.equal(r.status, 200);
assert.equal((await raw(cookieOf(r), "GET", "/api/auth/me")).status, 200, "thiết bị đổi PIN giữ phiên mới");
assert.equal((await raw(other, "GET", "/api/auth/me")).status, 401, "thiết bị khác bị đăng xuất");
assert.equal(await lastLoginOf(A.id), beforePinChange, "ĐỔI PIN không phải đăng nhập: lastLoginAt giữ nguyên");
assert.equal((await login(A.phone, "482915")).status, 200);
assert.ok((await lastLoginOf(A.id)) > beforePinChange, "đăng nhập lại thì lastLoginAt không lùi (mới hơn)");
A.pin = "482915";
console.log("✓ đổi PIN cá nhân");

// --- chống dò PIN
const victim = A.phone;
const ip1 = fresh();
for (let i = 0; i < 5; i++) assert.equal((await login(victim, "999888", ip1)).status, 401);
r = await login(victim, A.pin, fresh()); // PIN ĐÚNG nhưng đã bị khoá theo SĐT (IP khác)
assert.equal(r.status, 429, "khoá theo SĐT dù đến từ IP khác");
assert.ok(Number(r.headers.get("retry-after")) > 0);
assert.equal(r.body.error.code, "too_many_attempts");
r = await raw(ADMIN, "GET", "/api/staff");
assert.equal(r.body.staff.find((s) => s.id === A.id).locked, true);
assert.equal((await raw(ADMIN, "POST", `/api/staff/${A.id}/unlock`)).status, 200); // ADR-0042
assert.equal((await login(victim, A.pin, fresh())).status, 200);
r = await raw(ADMIN, "GET", "/api/staff");
assert.equal(r.body.staff.find((s) => s.id === A.id).locked, false);
console.log("✓ khoá sau 5 lần sai, admin mở khoá được");

// bắn song song 40 lần dò vào một SĐT: tối đa 5 lần được kiểm PIN
const victim2 = rnd();
await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Nạn nhân 2", phone: victim2, permissions: ["SALES"] });
const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => login(victim2, String(100000 + i * 7), fresh())));
const checked = burst.filter((b) => b.status === 401).length, blocked = burst.filter((b) => b.status === 429).length;
console.log(`  song song 40: ${checked} lần được kiểm, ${blocked} bị chặn`);
assert.ok(checked <= 5, `chỉ được kiểm tối đa 5 lần, thực tế ${checked}`);
assert.equal(checked + blocked, 40);
// đăng nhập đúng xoá bộ đếm
const okPhone = rnd();
r = await raw(HR, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đúng sai", phone: okPhone, permissions: ["SALES"] });
const okPin = r.body.pin;
for (let i = 0; i < 4; i++) await login(okPhone, "999888", fresh());
assert.equal((await login(okPhone, okPin, fresh())).status, 200);
for (let i = 0; i < 4; i++) assert.equal((await login(okPhone, "999888", fresh())).status, 401); // bộ đếm đã được xoá
console.log("✓ chống dò song song + đăng nhập đúng xoá bộ đếm");

// giới hạn theo IP: 30 lần sai vào 31 SĐT khác nhau từ cùng một IP
const ipx = fresh(); let ipBlocked = false;
for (let i = 0; i < 34 && !ipBlocked; i++) ipBlocked = (await login(rnd(), "999888", ipx)).status === 429;
assert.ok(ipBlocked, "cùng IP dò nhiều SĐT phải bị chặn");
console.log("✓ giới hạn theo IP");

{ // ADR-0042: Toàn quyền là vai ẩn — danh sách tài khoản Quản trị nhận không có SUPER_ADMIN; tài khoản Toàn quyền không bị Quản trị tác động
  const list = await raw(ADMIN, "GET", "/api/staff");
  assert.ok(!JSON.stringify(list.body).includes("SUPER_ADMIN"), "Quản trị không thấy mã Toàn quyền");
  const supId = (await raw(SUPER_ADMIN, "GET", "/api/auth/me")).body.staff.id;
  const denied = await raw(ADMIN, "POST", `/api/staff/${supId}/reset-pin`);
  assert.equal(denied.status, 403);
  assert.doesNotMatch(JSON.stringify(denied.body), /Toàn quyền|Super Admin/i);
}
// --- ADR-0071 điều 2: đồng bộ nhân viên từ Google Sheet đã GỠ — không còn route (GET trùng khuôn PATCH /api/staff/:id nên 405; POST …/apply 404).
for (const who of [SUPER_ADMIN, ADMIN]) {
  r = await raw(who, "GET", "/api/staff/sheet");
  assert.ok(r.status === 404 || r.status === 405, `GET /api/staff/sheet: ${r.status}`);
  assert.equal((await raw(who, "POST", "/api/staff/sheet/apply", { phones: ["0999999999"] })).status, 404);
}
console.log("✓ đồng bộ nhân viên từ Sheet đã gỡ");

// --- ADR-0071 điều 1: Hành chính nhân sự — tạo được (đã dùng ở trên), không gán vai quản lý, không sửa Quản trị, không hỗ trợ đăng nhập, không xem đơn / bảo trì.
for (const roles of [["DIRECTOR"], ["OPERATIONS_MANAGER"], ["HR_STAFF"]]) {
  assert.equal((await raw(HR, "PUT", `/api/staff/${A.id}/roles`, { roles })).status, 403, `HCNS gán ${roles}`);
}
assert.equal((await raw(HR, "PUT", `/api/staff/${A.id}/roles`, { roles: ["GUIDE_INTERNAL"] })).status, 200, "HCNS gán vai thường");
const quanTriId = (await raw(ADMIN, "GET", "/api/auth/me")).body.staff.id;
const hrId = (await raw(HR, "GET", "/api/auth/me")).body.staff.id;
assert.equal((await raw(HR, "PATCH", `/api/staff/${quanTriId}`, { fullName: "Đổi Tên Quản Trị" })).status, 403, "HCNS không sửa Quản trị");
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${hrId}`, { active: false })).status, 403, "Quản trị không sửa HCNS");
for (const path of [`/api/staff/${A.id}/reset-pin`, `/api/staff/${A.id}/unlock`]) assert.equal((await raw(HR, "POST", path)).status, 403, path);
for (const path of ["/api/orders", "/api/orders/dashboard", "/api/parties", "/api/catalog", "/api/maintenance", "/api/audit"]) assert.equal((await raw(HR, "GET", path)).status, 403, path);
assert.equal((await raw(ADMIN, "GET", "/api/maintenance")).status, 403, "ADR-0071 điều 3c: bảo trì chỉ Toàn quyền");
assert.equal((await raw(SUPER_ADMIN, "GET", "/api/maintenance")).status, 200);
console.log("✓ Hành chính nhân sự: tạo tài khoản, giới hạn vai và hỗ trợ đăng nhập");
console.log("E2E ADMIN OK");
