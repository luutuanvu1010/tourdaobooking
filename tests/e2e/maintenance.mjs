// Chế độ bảo trì chỉ chủ dự án dùng được (module `maintenance`, docs/HANDOFF-CHE-DO-BAO-TRI.md): bật thì MỌI tài khoản trừ SĐT được phép nhận 503 `maintenance` — kể cả phiên
// đang mở, kể cả ở đăng nhập (sau Turnstile, TRƯỚC PIN, không tiêu hao lượt thử) — còn người được phép dùng bình thường; tắt thì mọi thứ trở lại; có đường thoát khẩn bằng SQL.
// Server e2e không có tài khoản 0989929373 (số được phép mặc định của production) nên kịch bản tạm đặt `mnt_setting.allowed_phones` = SĐT của tài khoản `admin` test và
// KHÔI PHỤC (tắt + trả '0989929373') ở `finally` — kể cả khi assert hỏng — để không làm hỏng kịch bản khác dùng chung D1 và các tài khoản test. Chạy CUỐI danh sách.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const SEED_ALLOWED = "0989929373";
const ADMIN_PHONE = ACCOUNTS.admin.phone;
const HEAD = "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là ";
const TAIL = "liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).";
const COUNTDOWN = /Thời gian dự kiến hoàn tất là (\d+ giờ \d{2} phút \d{2} giây|\d+ phút \d{2} giây|\d+ giây), liên hệ/;

const setting = async () => (await sqlRows("SELECT enabled, ends_at, allowed_phones FROM mnt_setting WHERE id = 'default'"))[0];
const setAllowed = (phones) => sql(`UPDATE mnt_setting SET allowed_phones = '${phones}' WHERE id = 'default'`);
const restore = () => sql(`UPDATE mnt_setting SET enabled = 0, ends_at = NULL, allowed_phones = '${SEED_ALLOWED}' WHERE id = 'default'`);
const count = async (table) => (await sqlRows(`SELECT count(*) AS n FROM ${table}`))[0].n;

/** Phản hồi 503 `maintenance` đúng thân: mã, giờ dự kiến khớp, câu chữ chủ dự án đã chốt, không lưu đệm, không cookie. */
function assertBlocked(r, endsAt, what) {
  assert.equal(r.status, 503, `${what}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "maintenance", what);
  assert.equal(r.body.error.endsAt, endsAt, `${what}: giờ dự kiến phải đi kèm trong thân lỗi`);
  assert.ok(r.body.error.message.startsWith(HEAD), `${what}: ${r.body.error.message}`);
  assert.ok(r.body.error.message.endsWith(TAIL), `${what}: ${r.body.error.message}`);
  assert.match(r.body.error.message, COUNTDOWN, what);
  assert.equal(r.headers.get("cache-control"), "no-store", what);
  assert.match(r.headers.get("content-type"), /^application\/json/, what);
  assert.equal(r.cookie, null, `${what}: không được cấp cookie`);
}

let r;
try {
  // --- nền: migration 0016 gieo TẮT với đúng SĐT của chủ dự án
  assert.deepEqual(await setting(), { enabled: 0, ends_at: null, allowed_phones: SEED_ALLOWED }, "migration 0016 phải gieo TẮT + 0989929373");
  r = await call(null, "GET", "/api/auth/config");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.maintenance, { on: false, endsAt: null });

  // Phiên tạo SẴN trước khi bật (bảo trì phải chặn cả phiên đang mở). Admin có hai phiên.
  const SALES = await session(ACCOUNTS.salesA);
  const ACCOUNTANT = await session(ACCOUNTS.accountant);
  const FIELD = await session(ACCOUNTS.field);
  const ADMIN = await session(ACCOUNTS.admin);
  const ADMIN2 = await session(ACCOUNTS.admin);
  const BLOCKED = [["salesA", SALES], ["accountant", ACCOUNTANT], ["field", FIELD]];

  // --- 1) TẮT: mọi tài khoản dùng bình thường, /me báo maintenance tắt; quyền bật/tắt
  for (const [name, cookie] of [...BLOCKED, ["admin", ADMIN]]) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, name);
    assert.deepEqual(r.body.maintenance, { on: false, endsAt: null }, name);
  }
  assert.equal((await call(SALES, "PUT", "/api/maintenance", { on: false })).status, 403, "không ADMIN → 403 từ router");
  assert.equal((await call(SALES, "GET", "/api/maintenance")).status, 403);
  assert.equal((await call(null, "GET", "/api/maintenance")).status, 401);
  // Admin test KHÔNG nằm trong danh sách được phép (mặc định chỉ 0989929373): xem được trạng thái nhưng không bật/tắt được.
  r = await call(ADMIN, "GET", "/api/maintenance");
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: false });
  r = await call(ADMIN, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "forbidden");
  assert.equal((await setting()).enabled, 0, "bị từ chối thì KHÔNG được bật");
  await setAllowed(ADMIN_PHONE); // từ đây admin test đóng vai chủ dự án
  r = await call(ADMIN, "GET", "/api/maintenance");
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: true });
  console.log("✓ nền TẮT: mọi tài khoản dùng bình thường; chỉ ADMIN trong danh sách được phép mới bật/tắt được (không lộ danh sách)");

  // --- 2) kiểm đầu vào PUT
  const past = new Date(Date.now() - 60_000).toISOString();
  const far = new Date(Date.now() + 8 * 24 * 3600_000).toISOString();
  const bad = [
    [{}, /bật hay tắt/],
    [{ on: "true" }, /bật hay tắt/],
    [{ on: 1 }, /bật hay tắt/],
    [{ on: null }, /bật hay tắt/],
    [{ on: true }, /giờ dự kiến/],
    [{ on: true, endsAt: "rác" }, /giờ dự kiến/],
    [{ on: true, endsAt: 1234567890 }, /giờ dự kiến/],
    [{ on: true, endsAt: past }, /tương lai/],
    [{ on: true, endsAt: far }, /7 ngày/],
    [{ on: true, endsAt: "2030-09-22T10:00" }, /giờ dự kiến/], // thiếu múi giờ: mơ hồ giờ VN/UTC nên không nhận
    [{ on: true, endsAt: "2030-02-30T10:00:00Z" }, /giờ dự kiến/], // ngày không có thật (Date.parse lăn sang tháng 3)
  ];
  for (const [body, re] of bad) {
    r = await call(ADMIN, "PUT", "/api/maintenance", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.body.error.code, "invalid_input");
    assert.match(r.body.error.message, re, JSON.stringify(body));
  }
  r = await call(ADMIN, "PUT", "/api/maintenance"); // không thân
  assert.equal(r.status, 400);
  assert.equal((await setting()).enabled, 0, "đầu vào sai thì KHÔNG được bật");
  console.log("✓ kiểm đầu vào: thiếu/sai `on`, thiếu/rác/quá khứ/quá 7 ngày/không múi giờ/ngày không có thật → 400 tiếng Việt, không bật");

  // --- 2b) không cho đổi SĐT của tài khoản đang là người được phép (đổi là tự khoá hoặc chuyển quyền cho người khác)
  const adminId = (await call(ADMIN, "GET", "/api/auth/me")).body.staff.id;
  r = await call(ADMIN, "PATCH", `/api/staff/${adminId}`, { phone: "0900000098" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "account_rule");
  assert.match(r.body.error.message, /chủ dự án/);
  assert.equal((await call(ADMIN, "GET", "/api/staff")).body.staff.find((s) => s.id === adminId).phone, ADMIN_PHONE, "SĐT của tài khoản chủ không được đổi");
  r = await call(ADMIN, "PATCH", `/api/staff/${adminId}`, { phone: ADMIN_PHONE }); // gửi lại đúng số cũ = không đổi gì
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ tài khoản chủ không đổi được SĐT (409); tài khoản khác đổi SĐT như cũ (admin.mjs)");

  // --- 3) BẬT (chủ)
  const ENDS = new Date(Date.now() + 30 * 60_000).toISOString();
  const ordersBefore = await count("orders");
  const listOf = async () => (await call(ADMIN, "GET", "/api/staff")).body.staff;
  const lastLoginOf = async (phone) => (await listOf()).find((s) => s.phone === phone).lastLoginAt;
  const salesLastLogin = await lastLoginOf(ACCOUNTS.salesA.phone);
  assert.ok(salesLastLogin, "salesA vừa đăng nhập nên phải có lastLoginAt");
  r = await call(ADMIN, "PUT", "/api/maintenance", { on: true, endsAt: ENDS });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { on: true, endsAt: ENDS, canToggle: true });
  assert.deepEqual(await setting(), { enabled: 1, ends_at: ENDS, allowed_phones: ADMIN_PHONE });

  // --- 4) BẬT: phiên CÓ SẴN của người khác bị chặn ngay, mọi loại route, kể cả route quyền ADMIN (503 chứ KHÔNG 403)
  for (const [name, cookie] of BLOCKED) {
    assertBlocked(await call(cookie, "GET", "/api/auth/me"), ENDS, `${name} /me`);
    assertBlocked(await call(cookie, "GET", "/api/orders"), ENDS, `${name} GET /api/orders`);
    assertBlocked(await call(cookie, "PUT", "/api/maintenance", { on: false }), ENDS, `${name} PUT /api/maintenance (503 chứ không 403)`);
  }
  assertBlocked(await call(FIELD, "GET", "/api/staff"), ENDS, "field GET /api/staff (503 chứ không 403: cổng chạy trước kiểm quyền)");
  assertBlocked(await call(ACCOUNTANT, "GET", "/api/audit"), ENDS, "accountant GET /api/audit");
  assertBlocked(await call(SALES, "POST", "/api/orders", orderInput()), ENDS, "salesA POST /api/orders");
  assert.equal(await count("orders"), ordersBefore, "thao tác ghi bị chặn không được tạo đơn");
  console.log("✓ BẬT: phiên đang mở của salesA/kế toán/FIELD bị 503 `maintenance` (kèm giờ dự kiến + đúng câu chữ) ở mọi route, kể cả ghi và route ADMIN");

  // --- 5) BẬT: đăng nhập — 503 cùng thân cho MỌI SĐT, không tiêu hao lượt thử PIN; Turnstile vẫn chạy TRƯỚC
  const attemptsBefore = await count("login_attempt");
  const strip = (m) => m.replace(COUNTDOWN, "Thời gian dự kiến hoàn tất là (đếm ngược), liên hệ");
  const messages = [];
  for (const [label, phone, pin] of [
    ["đúng PIN", ACCOUNTS.salesA.phone, ACCOUNTS.salesA.pin],
    ["sai PIN", ACCOUNTS.salesA.phone, "999888"],
    ["SĐT không tồn tại", randomPhone(), "999888"],
    ["SĐT hỏng", "abc", "999888"],
  ]) {
    for (let i = 0; i < (label === "sai PIN" ? 8 : 1); i++) {
      // 8 lần sai PIN: nhiều hơn giới hạn 5 lần/SĐT — nếu bị đếm thì salesA sẽ bị khoá và bước 9 hỏng.
      r = await login(phone, pin);
      assertBlocked(r, ENDS, `đăng nhập ${label}`);
      messages.push(strip(r.body.error.message));
    }
  }
  assert.equal(new Set(messages).size, 1, "cùng một thông điệp cho mọi SĐT (không lộ ai có tài khoản)");
  assert.equal(await count("login_attempt"), attemptsBefore, "đăng nhập bị chặn vì bảo trì KHÔNG được tiêu hao lượt thử PIN");
  assert.equal(await lastLoginOf(ACCOUNTS.salesA.phone), salesLastLogin, "đăng nhập bị chặn không được ghi 'Đăng nhập gần nhất'");
  r = await call(null, "POST", "/api/auth/login", { phone: ACCOUNTS.salesA.phone, pin: ACCOUNTS.salesA.pin }); // thiếu token Turnstile
  assert.equal(r.status, 403, "Turnstile chạy TRƯỚC cổng bảo trì");
  assert.equal(r.body.error.code, "turnstile_failed");
  console.log("✓ BẬT: đăng nhập → 503 cùng thân cho đúng PIN/sai PIN/SĐT lạ, không tiêu hao lượt PIN, không ghi lastLoginAt; thiếu token Turnstile vẫn 403");

  // --- 6) BẬT: chủ dùng bình thường (phiên cũ, phiên thứ hai, đăng nhập mới)
  for (const [name, cookie] of [["admin cũ", ADMIN], ["admin thứ hai", ADMIN2]]) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, name);
    assert.deepEqual(r.body.maintenance, { on: true, endsAt: ENDS }, `${name}: /me báo đang bảo trì để giao diện hiện dải nhắc`);
    assert.equal((await call(cookie, "GET", "/api/orders")).status, 200, name);
    assert.equal((await call(cookie, "GET", "/api/staff")).status, 200, name);
  }
  r = await login(ADMIN_PHONE, ACCOUNTS.admin.pin);
  assert.equal(r.status, 200, `chủ đăng nhập mới khi đang bảo trì: ${JSON.stringify(r.body)}`);
  assert.equal((await call(r.cookie, "GET", "/api/auth/me")).status, 200);
  assert.deepEqual((await call(ADMIN, "GET", "/api/maintenance")).body, { on: true, endsAt: ENDS, canToggle: true });
  console.log("✓ BẬT: chủ dùng bình thường (phiên cũ, phiên thứ hai, đăng nhập mới)");

  // --- 7) BẬT: route công khai vẫn chạy, không lộ ai được phép
  r = await call(null, "GET", "/api/auth/config");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.maintenance, { on: true, endsAt: ENDS });
  assert.doesNotMatch(JSON.stringify(r.body), /allowed|0900000004|0989929373|phone/i, "config công khai không được lộ danh sách được phép");
  assert.equal((await call(null, "GET", "/api/company")).status, 200);
  r = await call(SALES, "POST", "/api/auth/logout");
  assert.equal(r.status, 200, "người bị chặn vẫn đăng xuất được");
  console.log("✓ BẬT: /api/auth/config (on + giờ dự kiến, không lộ danh sách), /api/company, logout vẫn chạy");

  // --- 9) TẮT: mọi thứ trở lại; phiên cũ dùng lại được; không ai bị khoá
  r = await call(ADMIN, "PUT", "/api/maintenance", { on: false });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: true });
  assert.deepEqual(await setting(), { enabled: 0, ends_at: null, allowed_phones: ADMIN_PHONE });
  for (const [name, cookie] of BLOCKED) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, `${name}: phiên cũ dùng lại được sau khi tắt`);
    assert.deepEqual(r.body.maintenance, { on: false, endsAt: null });
  }
  r = await login(ACCOUNTS.salesA.phone, ACCOUNTS.salesA.pin);
  assert.equal(r.status, 200, `salesA không bị khoá sau 8 lần sai PIN lúc bảo trì: ${JSON.stringify(r.body)}`);
  assert.ok((await lastLoginOf(ACCOUNTS.salesA.phone)) > salesLastLogin, "đăng nhập thật thì lastLoginAt mới hơn");
  assert.deepEqual((await call(null, "GET", "/api/auth/config")).body.maintenance, { on: false, endsAt: null });
  console.log("✓ TẮT: phiên cũ dùng lại được, đăng nhập lại được ngay (không bị khoá), config trở về tắt");

  // --- 8) nhật ký: có lần bật và lần tắt, KHÔNG lộ SĐT
  r = await call(ADMIN, "GET", "/api/audit?action=maintenance_changed&limit=20");
  assert.equal(r.status, 200);
  const details = r.body.entries.map((e) => e.detail);
  assert.ok(details.some((d) => /^Bật chế độ bảo trì, dự kiến hoàn tất lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/.test(d)), `thiếu dòng Bật: ${JSON.stringify(details)}`);
  assert.ok(details.includes("Tắt chế độ bảo trì"), `thiếu dòng Tắt: ${JSON.stringify(details)}`);
  assert.equal(r.body.entries.length, 2, "chỉ hai lần bật/tắt thành công bằng API (lần bị từ chối/400 không ghi nhật ký)");
  for (const e of r.body.entries) {
    assert.equal(e.action, "maintenance_changed");
    assert.equal(e.targetType, "system");
    assert.ok(e.staffId, "có người thao tác");
  }
  // Chỉ quét `detail` (id là UUID nên có thể tình cờ có 9+ chữ số liền) và kiểm hai SĐT liên quan không hề xuất hiện ở đâu trong phản hồi.
  assert.doesNotMatch(details.join(" "), /\d{9,}/, "chi tiết nhật ký không được chứa SĐT (chuỗi 9+ chữ số liền)");
  assert.ok(!JSON.stringify(r.body).includes(ADMIN_PHONE) && !JSON.stringify(r.body).includes(SEED_ALLOWED), "nhật ký không lộ SĐT của chủ/admin");
  console.log("✓ nhật ký: đủ lần bật + lần tắt, không lộ SĐT");

  // --- 10) đường thoát khẩn: bật lại rồi tắt bằng MỘT câu SQL (như wrangler d1 execute --remote), không cần deploy
  r = await call(ADMIN, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 60 * 60_000).toISOString() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(SALES, "GET", "/api/auth/me")).status, 503);
  await sql("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal((await call(SALES, "GET", "/api/auth/me")).status, 200, "tắt bằng SQL có hiệu lực ngay");
  r = await call(null, "GET", "/api/auth/config");
  assert.deepEqual(r.body.maintenance, { on: false, endsAt: null }, "tắt bằng SQL: dù ends_at còn đó, giờ dự kiến không lộ ra khi tắt");
  console.log("✓ đường thoát khẩn: UPDATE mnt_setting SET enabled = 0 → vào lại được ngay");
} finally {
  await restore();
}
assert.deepEqual(await setting(), { enabled: 0, ends_at: null, allowed_phones: SEED_ALLOWED }, "phải trả cài đặt về nguyên trạng");
console.log("E2E MAINTENANCE OK");
