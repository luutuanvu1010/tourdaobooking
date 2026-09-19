import assert from "node:assert/strict";
const B = "http://localhost:8787";
let ipn = 0;
const fresh = () => `10.1.${Math.floor(Math.random() * 250)}.${++ipn}`; // IP giả riêng cho từng kịch bản
async function raw(cookie, method, path, body, ip = "10.0.0.1") {
  const r = await fetch(B + path, { method, headers: { cookie: cookie ?? "", "content-type": "application/json", "cf-connecting-ip": ip }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null), setCookie: r.headers.get("set-cookie"), headers: r.headers };
}
const login = async (phone, pin, ip = fresh()) => raw(null, "POST", "/api/auth/login", { phone, pin }, ip);
const cookieOf = (r) => r.setCookie.split(";")[0];
const rnd = () => "09" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");

const ADMIN = cookieOf(await login("0900000004", "112233"));
const SALES = cookieOf(await login("0900000002", "246810"));

// --- phân quyền API
assert.equal((await raw(null, "GET", "/api/staff")).status, 401);
assert.equal((await raw(SALES, "GET", "/api/staff")).status, 403);
assert.equal((await raw(SALES, "POST", "/api/staff", { fullName: "X", phone: rnd() })).status, 403);
assert.equal((await raw(SALES, "GET", "/api/staff/sheet")).status, 403);

// --- tạo nhân viên
const phoneA = rnd();
let r = await raw(ADMIN, "POST", "/api/staff", { fullName: "  Nguyễn   Test Một ", phone: phoneA.replace(/^0/, "+84 ") });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.staff.phone, phoneA); assert.equal(r.body.staff.fullName, "Nguyễn Test Một"); assert.equal(r.body.staff.role, "sales");
assert.match(r.body.pin, /^\d{6}$/);
const A = { id: r.body.staff.id, pin: r.body.pin, phone: phoneA };
assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Trùng", phone: phoneA })).status, 409);
assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Sai", phone: "123" })).status, 400);
assert.equal((await raw(ADMIN, "POST", "/api/staff", { fullName: "Sai vai", phone: rnd(), role: "boss" })).status, 400);
r = await login(A.phone, A.pin); assert.equal(r.status, 200);
const A_COOKIE = cookieOf(r);
console.log("✓ tạo + đăng nhập bằng PIN sinh ra");

// --- nhật ký: có dòng không gắn đơn (LEFT JOIN), KHÔNG chứa PIN
r = await raw(ADMIN, "GET", "/api/audit?action=staff_created&limit=5");
assert.equal(r.status, 200);
const created = r.body.entries.find((e) => e.targetId === A.id);
assert.ok(created, "staff_created phải hiện trong /api/audit");
assert.equal(created.orderId, null); assert.equal(created.targetLabel, "Nguyễn Test Một");
assert.ok(!JSON.stringify(r.body).includes(A.pin), "PIN không được xuất hiện trong nhật ký");
console.log("✓ nhật ký hiển thị hành động không gắn đơn, không lộ PIN");

// --- sửa: đổi tên/SĐT/vai trò/ngưng
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { fullName: "Nguyễn Test Hai", role: "admin" });
assert.equal(r.status, 200); assert.equal(r.body.staff.role, "admin");
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { role: "sales" });
assert.equal(r.body.staff.role, "sales");
r = await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { phone: "0900000002" });
assert.equal(r.status, 409); // trùng SĐT người khác
// tự ngưng / tự hạ quyền bị chặn
const me = (await raw(ADMIN, "GET", "/api/auth/me")).body.staff;
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${me.id}`, { active: false })).status, 409);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${me.id}`, { role: "sales" })).status, 409);
// ngưng → hiệu lực NGAY với phiên đang mở
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 200);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { active: false })).status, 200);
assert.equal((await raw(A_COOKIE, "GET", "/api/auth/me")).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 401);
assert.equal((await raw(ADMIN, "PATCH", `/api/staff/${A.id}`, { active: true })).status, 200);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(ADMIN, "GET", "/api/audit?q=Nguyễn Test&limit=20");
const actions = r.body.entries.filter((e) => e.targetId === A.id).map((e) => e.action);
for (const a of ["staff_created", "staff_updated", "staff_role_changed", "staff_suspended", "staff_reactivated"]) assert.ok(actions.includes(a), `thiếu ${a}: ${actions}`);
console.log("✓ sửa/ngưng/kích hoạt, tự khoá bị chặn, ngưng có hiệu lực ngay, đủ nhật ký");

// --- đặt lại PIN thu hồi phiên cũ
const s1 = cookieOf(await login(A.phone, A.pin));
r = await raw(ADMIN, "POST", `/api/staff/${A.id}/reset-pin`);
assert.equal(r.status, 200); assert.match(r.body.pin, /^\d{6}$/); assert.notEqual(r.body.pin, A.pin);
const oldPin = A.pin; A.pin = r.body.pin;
assert.equal((await raw(s1, "GET", "/api/auth/me")).status, 401, "phiên cũ phải bị thu hồi");
assert.equal((await login(A.phone, oldPin)).status, 401);
assert.equal((await login(A.phone, A.pin)).status, 200);
r = await raw(ADMIN, "GET", "/api/audit?action=pin_reset&limit=3");
assert.ok(r.body.entries.some((e) => e.targetId === A.id));
assert.ok(!JSON.stringify(r.body).includes(A.pin));
console.log("✓ đặt lại PIN thu hồi phiên cũ, nhật ký không lộ PIN");

// --- đổi PIN của chính mình
let sess = cookieOf(await login(A.phone, A.pin));
const other = cookieOf(await login(A.phone, A.pin)); // thiết bị khác
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: "000000", newPin: "482915" })).status, 403);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "123456" })).status, 400);
assert.equal((await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: A.pin })).status, 400);
r = await raw(sess, "POST", "/api/account/change-pin", { currentPin: A.pin, newPin: "482915" });
assert.equal(r.status, 200);
assert.equal((await raw(cookieOf(r), "GET", "/api/auth/me")).status, 200, "thiết bị đổi PIN giữ phiên mới");
assert.equal((await raw(other, "GET", "/api/auth/me")).status, 401, "thiết bị khác bị đăng xuất");
assert.equal((await login(A.phone, "482915")).status, 200);
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
assert.equal((await raw(ADMIN, "POST", `/api/staff/${A.id}/unlock`)).status, 200);
assert.equal((await login(victim, A.pin, fresh())).status, 200);
r = await raw(ADMIN, "GET", "/api/staff");
assert.equal(r.body.staff.find((s) => s.id === A.id).locked, false);
console.log("✓ khoá sau 5 lần sai, admin mở khoá được");

// bắn song song 40 lần dò vào một SĐT: tối đa 5 lần được kiểm PIN
const victim2 = rnd();
await raw(ADMIN, "POST", "/api/staff", { fullName: "Nạn nhân 2", phone: victim2 });
const burst = await Promise.all(Array.from({ length: 40 }, (_, i) => login(victim2, String(100000 + i * 7), fresh())));
const checked = burst.filter((b) => b.status === 401).length, blocked = burst.filter((b) => b.status === 429).length;
console.log(`  song song 40: ${checked} lần được kiểm, ${blocked} bị chặn`);
assert.ok(checked <= 5, `chỉ được kiểm tối đa 5 lần, thực tế ${checked}`);
assert.equal(checked + blocked, 40);
// đăng nhập đúng xoá bộ đếm
const okPhone = rnd();
r = await raw(ADMIN, "POST", "/api/staff", { fullName: "Đúng sai", phone: okPhone });
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

// --- kéo từ Sheet (Sheet nhân viên thật, chưa có SĐT)
r = await raw(ADMIN, "GET", "/api/staff/sheet");
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log(`  Sheet: ${r.body.candidates.length} ứng viên, ${r.body.problems.length} vấn đề, ${r.body.notInSheet.length} có trong hệ thống nhưng không có trong Sheet`);
assert.ok(Array.isArray(r.body.candidates) && Array.isArray(r.body.problems) && Array.isArray(r.body.notInSheet));
assert.equal((await raw(ADMIN, "POST", "/api/staff/sheet/apply", { phones: [] })).status, 400);
assert.equal((await raw(ADMIN, "POST", "/api/staff/sheet/apply", { phones: ["0999999999"] })).status, 409); // không có trong Sheet → không tạo
assert.equal((await raw(SALES, "POST", "/api/staff/sheet/apply", { phones: ["0999999999"] })).status, 403);
console.log("✓ kéo từ Sheet: xem trước + chỉ tin dữ liệu Sheet");
console.log("E2E ADMIN OK");
