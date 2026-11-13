// Chế độ bảo trì chỉ Toàn quyền dùng được (module `maintenance`, docs/HANDOFF-CHE-DO-BAO-TRI.md, ADR-0071 điều 3): bật thì MỌI tài khoản không giữ Toàn quyền — kể cả
// Quản trị — nhận 503 `maintenance`, kể cả phiên đang mở, kể cả ở đăng nhập (sau Turnstile, TRƯỚC PIN, không tiêu hao lượt thử); tài khoản Toàn quyền dùng bình thường; tắt thì
// mọi thứ trở lại; có đường thoát khẩn bằng SQL. Cột `mnt_setting.allowed_phones` THÔI được đọc: kịch bản cố ý đặt nó = SĐT của Quản trị / Bán hàng để chứng minh danh sách
// không còn nghĩa, rồi KHÔI PHỤC (tắt + trả '0989929373') ở `finally` — kể cả khi assert hỏng. Chạy CUỐI danh sách.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";
import { MAINTENANCE_CONTENT_DEFAULT as ND } from "../../src/shared/maintenance.ts";

const SEED_ALLOWED = "0989929373";
const ADMIN_PHONE = ACCOUNTS.admin.phone;
const OWNER_PHONE = ACCOUNTS.superAdmin.phone;
const HEAD = "Hệ thống đang tạm đóng để bảo trì. Thời gian dự kiến hoàn tất là ";
const TAIL = "liên hệ quản trị viên khi cần hỗ trợ thêm (0989929373).";
const COUNTDOWN = /Thời gian dự kiến hoàn tất là (\d+ ngày \d+ giờ \d+ phút|\d+ giờ \d{2} phút \d{2} giây|\d+ phút \d{2} giây|\d+ giây), liên hệ/;

const setting = async () => (await sqlRows("SELECT enabled, ends_at, allowed_phones FROM mnt_setting WHERE id = 'default'"))[0];
const setAllowed = (phones) => sql(`UPDATE mnt_setting SET allowed_phones = '${phones}' WHERE id = 'default'`);
const restore = () => sql(`UPDATE mnt_setting SET enabled = 0, ends_at = NULL, allowed_phones = '${SEED_ALLOWED}', content_json = NULL WHERE id = 'default'`);
const count = async (table) => (await sqlRows(`SELECT count(*) AS n FROM ${table}`))[0].n;

/** Phản hồi 503 `maintenance` đúng thân: mã, giờ dự kiến khớp, câu chữ chủ dự án đã chốt, không lưu đệm, không cookie. */
function assertBlocked(r, endsAt, what) {
  assert.equal(r.status, 503, `${what}: ${JSON.stringify(r.body)}`);
  assert.equal(r.body.error.code, "maintenance", what);
  assert.deepEqual(r.body.error.content, ND, `${what}: nội dung màn bảo trì (chưa lưu → mặc định) đi kèm thân 503`);
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
  const OWNER = await session(ACCOUNTS.superAdmin); // chủ dự án = Toàn quyền (ADR-0019: ô settings.ops)
  const OWNER2 = await session(ACCOUNTS.superAdmin);
  const NGUOI_DANG_XUAT = await session(ACCOUNTS.hr); // ADR-0075: đăng xuất NAY kết thúc dòng phiên → dùng phiên riêng của Nhân sự (cũng bị chặn lúc bảo trì), không đụng phiên của BLOCKED
  // ADR-0071 điều 3a: Quản trị cũng bị chặn (trước đây miễn trừ theo SĐT).
  const BLOCKED = [["salesA", SALES], ["accountant", ACCOUNTANT], ["field", FIELD], ["admin", ADMIN]];

  // --- 1) TẮT: mọi tài khoản dùng bình thường, /me báo maintenance tắt; quyền bật/tắt
  for (const [name, cookie] of BLOCKED) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, name);
    assert.deepEqual(r.body.maintenance, { on: false, endsAt: null }, name);
  }
  assert.equal((await call(SALES, "PUT", "/api/maintenance", { on: false })).status, 403, "không ADMIN → 403 từ router");
  assert.equal((await call(SALES, "GET", "/api/maintenance")).status, 403);
  assert.equal((await call(null, "GET", "/api/maintenance")).status, 401);
  // ADR-0071 điều 3c: GET và PUT chỉ hỏi ô settings.ops (Toàn quyền) — Quản trị 403 kể cả khi SĐT của họ nằm trong danh sách cũ; Toàn quyền KHÔNG cần SĐT trong danh sách.
  await setAllowed(ADMIN_PHONE);
  r = await call(ADMIN, "GET", "/api/maintenance");
  assert.equal(r.status, 403, `Quản trị xem cài đặt bảo trì → 403: ${JSON.stringify(r.body)}`);
  r = await call(ADMIN, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 30 * 60_000).toISOString() });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "forbidden");
  assert.equal((await setting()).enabled, 0, "bị từ chối thì KHÔNG được bật");
  r = await call(OWNER, "GET", "/api/maintenance");
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: true, content: ND }, "Toàn quyền (SĐT KHÔNG trong danh sách) xem được và bật/tắt được");
  console.log("✓ nền TẮT: mọi tài khoản dùng bình thường; GET/PUT /api/maintenance chỉ Toàn quyền (Quản trị 403 dù SĐT trong danh sách cũ)");

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
    r = await call(OWNER, "PUT", "/api/maintenance", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.equal(r.body.error.code, "invalid_input");
    assert.match(r.body.error.message, re, JSON.stringify(body));
  }
  r = await call(OWNER, "PUT", "/api/maintenance"); // không thân
  assert.equal(r.status, 400);
  assert.equal((await setting()).enabled, 0, "đầu vào sai thì KHÔNG được bật");
  console.log("✓ kiểm đầu vào: thiếu/sai `on`, thiếu/rác/quá khứ/quá 7 ngày/không múi giờ/ngày không có thật → 400 tiếng Việt, không bật");

  // --- 2b) ADR-0071 điều 3d: luật "không đổi SĐT của người được phép" đã bỏ — SĐT không còn gắn với chế độ bảo trì. Đổi SĐT Bán hàng (đang trong danh sách cũ)
  // sang số khác rồi trả lại: cả hai lần 200.
  await setAllowed(`${ADMIN_PHONE},${ACCOUNTS.salesA.phone}`);
  const salesId = (await call(SALES, "GET", "/api/auth/me")).body.staff.id;
  const soTam = randomPhone();
  r = await call(OWNER, "PATCH", `/api/staff/${salesId}`, { phone: soTam });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(OWNER, "PATCH", `/api/staff/${salesId}`, { phone: ACCOUNTS.salesA.phone });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ đổi SĐT của tài khoản trong danh sách cũ: được (luật phoneChangeProblem đã bỏ)");
  // Đổi SĐT có thể thu hồi phiên cũ của salesA — lấy lại phiên trước khi bật bảo trì (bảo trì phải chặn cả phiên đang mở).
  const SALES2 = await session(ACCOUNTS.salesA);
  BLOCKED[0] = ["salesA", SALES2];

  // --- 2c) Tài khoản Toàn quyền đã NGƯNG (ADR-0071 điều 3a: miễn trừ chỉ cho Toàn quyền ĐANG HOẠT ĐỘNG): tạo bằng vai IT (Quản trị + Toàn quyền) rồi ngưng.
  // Bước 5 khẳng định đăng nhập đúng PIN của tài khoản này nhận ĐÚNG cùng thân 503 như mọi người bị chặn.
  const TQ_NGUNG_PHONE = randomPhone();
  r = await call(OWNER, "POST", "/api/staff", { roles: ["IT"], fullName: "Toàn Quyền Đã Ngưng (test)", phone: TQ_NGUNG_PHONE, taoHoSoMoi: true });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.ok(r.body.staff.permissions.includes("SUPER_ADMIN"), `vai IT phải sinh Toàn quyền: ${JSON.stringify(r.body.staff.permissions)}`);
  const TQ_NGUNG_PIN = r.body.pin;
  r = await call(OWNER, "PATCH", `/api/staff/${r.body.staff.id}`, { active: false });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ dựng tài khoản Toàn quyền đã ngưng (vai IT)");

  // --- 3) BẬT (chủ)
  // Mốc TRƯỚC lần bật/tắt CỦA CHÍNH kịch bản này: nhật ký `audit_log` chỉ-thêm (trigger `audit_append_only` chặn DELETE, không riêng gì tài
  // liệu) và DÙNG CHUNG một D1 tạm cho cả lượt chạy — `bangtin.mjs` (Task 6, chạy TRƯỚC kịch bản này ở tests/e2e/run.mjs) cũng tự bật/tắt
  // bảo trì ở ca 10 để kiểm KN-2 (đóng mọi kết nối), nên cũng ghi hai dòng `maintenance_changed` CỦA NÓ trước khi tới đây. Đếm theo mốc thời
  // gian (chỉ lấy dòng TỪ đây trở đi) thay vì tổng số dòng từ đầu D1 tạm.
  const moc = new Date().toISOString();
  const ENDS = new Date(Date.now() + 30 * 60_000).toISOString();
  const ordersBefore = await count("orders");
  const listOf = async () => (await call(OWNER, "GET", "/api/staff")).body.staff;
  const lastLoginOf = async (phone) => (await listOf()).find((s) => s.phone === phone).lastLoginAt;
  const salesLastLogin = await lastLoginOf(ACCOUNTS.salesA.phone);
  assert.ok(salesLastLogin, "salesA vừa đăng nhập nên phải có lastLoginAt");
  r = await call(OWNER, "PUT", "/api/maintenance", { on: true, endsAt: ENDS });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { on: true, endsAt: ENDS, canToggle: true, content: ND });
  assert.deepEqual(await setting(), { enabled: 1, ends_at: ENDS, allowed_phones: `${ADMIN_PHONE},${ACCOUNTS.salesA.phone}` }, "danh sách cũ còn trong cột nhưng KHÔNG được đọc");

  // --- 4) BẬT: phiên CÓ SẴN của người khác bị chặn ngay, mọi loại route, kể cả route quyền ADMIN (503 chứ KHÔNG 403)
  for (const [name, cookie] of BLOCKED) {
    assertBlocked(await call(cookie, "GET", "/api/auth/me"), ENDS, `${name} /me`);
    assertBlocked(await call(cookie, "GET", "/api/orders"), ENDS, `${name} GET /api/orders`);
    assertBlocked(await call(cookie, "PUT", "/api/maintenance", { on: false }), ENDS, `${name} PUT /api/maintenance (503 chứ không 403)`);
  }
  assertBlocked(await call(FIELD, "GET", "/api/staff"), ENDS, "field GET /api/staff (503 chứ không 403: cổng chạy trước kiểm quyền)");
  assertBlocked(await call(ACCOUNTANT, "GET", "/api/audit"), ENDS, "accountant GET /api/audit");
  assertBlocked(await call(BLOCKED[0][1], "POST", "/api/orders", orderInput()), ENDS, "salesA POST /api/orders");
  assertBlocked(await call(ADMIN, "GET", "/api/staff"), ENDS, "admin GET /api/staff (Quản trị có SĐT trong danh sách cũ vẫn bị chặn)");
  assert.equal(await count("orders"), ordersBefore, "thao tác ghi bị chặn không được tạo đơn");
  console.log("✓ BẬT: phiên đang mở của salesA/kế toán/FIELD/Quản trị bị 503 `maintenance` (kèm giờ dự kiến + đúng câu chữ) ở mọi route, kể cả ghi và route ADMIN");

  // --- 5) BẬT: đăng nhập — 503 cùng thân cho MỌI SĐT, không tiêu hao lượt thử PIN; Turnstile vẫn chạy TRƯỚC
  const attemptsBefore = await count("login_attempt");
  const strip = (m) => m.replace(COUNTDOWN, "Thời gian dự kiến hoàn tất là (đếm ngược), liên hệ");
  const messages = [];
  for (const [label, phone, pin] of [
    ["đúng PIN", ACCOUNTS.salesA.phone, ACCOUNTS.salesA.pin],
    ["sai PIN", ACCOUNTS.salesA.phone, "999888"],
    ["SĐT không tồn tại", randomPhone(), "999888"],
    ["SĐT hỏng", "abc", "999888"],
    ["SĐT Quản trị (trong danh sách cũ), đúng PIN", ADMIN_PHONE, ACCOUNTS.admin.pin],
    ["Toàn quyền đã NGƯNG, đúng PIN", TQ_NGUNG_PHONE, TQ_NGUNG_PIN],
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
  console.log("✓ BẬT: đăng nhập → 503 cùng thân cho đúng PIN/sai PIN/SĐT lạ/SĐT Quản trị/Toàn quyền đã ngưng, không tiêu hao lượt PIN, không ghi lastLoginAt; thiếu token Turnstile vẫn 403");

  // --- 6) BẬT: chủ dùng bình thường (phiên cũ, phiên thứ hai, đăng nhập mới)
  for (const [name, cookie] of [["chủ (phiên cũ)", OWNER], ["chủ (phiên thứ hai)", OWNER2]]) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, name);
    assert.deepEqual(r.body.maintenance, { on: true, endsAt: ENDS, content: ND }, `${name}: /me báo đang bảo trì để giao diện hiện dải nhắc`);
    assert.equal((await call(cookie, "GET", "/api/orders")).status, 200, name);
    assert.equal((await call(cookie, "GET", "/api/staff")).status, 200, name);
  }
  r = await login(OWNER_PHONE, ACCOUNTS.superAdmin.pin);
  assert.equal(r.status, 200, `chủ đăng nhập mới khi đang bảo trì: ${JSON.stringify(r.body)}`);
  assert.equal((await call(r.cookie, "GET", "/api/auth/me")).status, 200);
  assert.deepEqual((await call(OWNER, "GET", "/api/maintenance")).body, { on: true, endsAt: ENDS, canToggle: true, content: ND });
  console.log("✓ BẬT: chủ dùng bình thường (phiên cũ, phiên thứ hai, đăng nhập mới)");

  // --- 7) BẬT: route công khai vẫn chạy, không lộ ai được phép
  r = await call(null, "GET", "/api/auth/config");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.maintenance, { on: true, endsAt: ENDS, content: ND }, "đang bật: kèm nội dung màn bảo trì (SĐT hỗ trợ công khai cho người bị chặn — vốn đã có trong câu báo 503)");
  assert.doesNotMatch(JSON.stringify(r.body), new RegExp(`allowed|${ADMIN_PHONE}|${ACCOUNTS.salesA.phone}`, "i"), "config công khai không được lộ danh sách được phép (cột cũ)");
  assert.equal((await call(null, "GET", "/api/company")).status, 200);
  assertBlocked(await call(NGUOI_DANG_XUAT, "GET", "/api/auth/me"), ENDS, "Nhân sự bị chặn như mọi tài khoản không phải Toàn quyền");
  r = await call(NGUOI_DANG_XUAT, "POST", "/api/auth/logout");
  assert.equal(r.status, 200, "người bị chặn vẫn đăng xuất được");
  console.log("✓ BẬT: /api/auth/config (on + giờ dự kiến, không lộ danh sách), /api/company, logout vẫn chạy");

  // --- 8b) TỰ TẮT khi hết giờ dự kiến (chủ dự án 30/9): dòng cài đặt vẫn `enabled = 1` nhưng giờ đã qua → không chặn ai, config báo tắt; KHÔNG ai bấm tắt.
  const PAST = new Date(Date.now() - 60_000).toISOString();
  await sql(`UPDATE mnt_setting SET ends_at = '${PAST}' WHERE id = 'default'`);
  assert.equal((await setting()).enabled, 1, "dòng cài đặt vẫn bật — tự tắt là do đọc theo giờ, không ghi lại");
  assert.deepEqual((await call(null, "GET", "/api/auth/config")).body.maintenance, { on: false, endsAt: null }, "hết giờ: config công khai báo tắt");
  for (const [name, cookie] of BLOCKED) {
    r = await call(cookie, "GET", "/api/auth/me");
    assert.equal(r.status, 200, `${name}: hết giờ bảo trì thì phiên cũ dùng lại được mà không cần chủ tắt: ${JSON.stringify(r.body)}`);
    assert.deepEqual(r.body.maintenance, { on: false, endsAt: null }, name);
  }
  assert.deepEqual((await call(OWNER, "GET", "/api/maintenance")).body, { on: false, endsAt: null, canToggle: true, content: ND }, "trang Tôi của chủ thấy đã tắt, nút bật vẫn còn");
  await sql(`UPDATE mnt_setting SET ends_at = '${ENDS}' WHERE id = 'default'`); // trả lại giờ tương lai: bước 9 tắt bằng nút như cũ
  assertBlocked(await call(BLOCKED[0][1], "GET", "/api/auth/me"), ENDS, "giờ tương lai trở lại → chặn lại");
  console.log("✓ TỰ TẮT: qua giờ dự kiến thì không chặn ai (phiên cũ, config, trang Tôi) dù dòng cài đặt còn bật");

  // --- 9) TẮT: mọi thứ trở lại; phiên cũ dùng lại được; không ai bị khoá
  r = await call(OWNER, "PUT", "/api/maintenance", { on: false });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: true, content: ND });
  assert.deepEqual({ ...(await setting()), allowed_phones: undefined }, { enabled: 0, ends_at: null, allowed_phones: undefined });
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
  r = await call(OWNER, "GET", "/api/audit?action=maintenance_changed&limit=20");
  assert.equal(r.status, 200);
  const entries = r.body.entries.filter((e) => e.at >= moc); // chỉ dòng TỪ mốc trên (của chính kịch bản này — xem chú thích ở mốc)
  const details = entries.map((e) => e.detail);
  assert.ok(details.some((d) => /^Bật chế độ bảo trì, dự kiến hoàn tất lúc \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}$/.test(d)), `thiếu dòng Bật: ${JSON.stringify(details)}`);
  assert.ok(details.includes("Tắt chế độ bảo trì"), `thiếu dòng Tắt: ${JSON.stringify(details)}`);
  assert.equal(entries.length, 2, "chỉ hai lần bật/tắt thành công bằng API (lần bị từ chối/400 không ghi nhật ký)");
  for (const e of entries) {
    assert.equal(e.action, "maintenance_changed");
    assert.equal(e.targetType, "system");
    assert.ok(e.staffId, "có người thao tác");
  }
  // Chỉ quét `detail` (id là UUID nên có thể tình cờ có 9+ chữ số liền) và kiểm hai SĐT liên quan không hề xuất hiện ở đâu trong phản hồi.
  assert.doesNotMatch(details.join(" "), /\d{9,}/, "chi tiết nhật ký không được chứa SĐT (chuỗi 9+ chữ số liền)");
  assert.ok(!JSON.stringify(r.body).includes(OWNER_PHONE) && !JSON.stringify(r.body).includes(SEED_ALLOWED), "nhật ký không lộ SĐT của chủ/admin");
  console.log("✓ nhật ký: đủ lần bật + lần tắt, không lộ SĐT");

  // --- 9b) NỘI DUNG MÀN BẢO TRÌ (bản mẫu 2c, ADR-0202 đề xuất): chỉ Toàn quyền sửa; máy chủ kiểm; 503 + config + câu báo dùng nội dung đã lưu; nhật ký không chép giá trị
  const MOI = { ...ND, tieuDe: "Nâng cấp bảng giá", lyDo: "Cập nhật giá mùa cao điểm.", sdt: "0905 123 456", zalo: "https://zalo.me/0905123456", hienWeb: false };
  const MOI_LUU = { ...MOI, sdt: "0905123456" };
  const mocNd = new Date().toISOString();
  const SALES3 = await session(ACCOUNTS.salesA); // bước 9 vừa đăng nhập lại salesA (chính sách một máy có thể kết thúc phiên cũ)
  for (const [name, cookie, code] of [["Bán hàng", SALES3, 403], ["Quản trị", ADMIN, 403], ["chưa đăng nhập", null, 401]]) {
    assert.equal((await call(cookie, "PUT", "/api/maintenance/content", MOI)).status, code, `${name} sửa nội dung màn bảo trì`);
  }
  for (const [body, re] of [
    [{ ...MOI, sdt: "12345" }, /10 số/],
    [{ ...MOI, zalo: "javascript:alert(1)" }, /zalo\.me/],
    [{ ...MOI, website: "http://tourdao.vn" }, /https/],
    [{ ...MOI, tieuDe: "" }, /tiêu đề/],
    [{ ...MOI, hienGoi: "có" }, /không hợp lệ/],
  ]) {
    r = await call(OWNER, "PUT", "/api/maintenance/content", body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match(r.body.error.message, re, JSON.stringify(body));
  }
  assert.equal((await sqlRows("SELECT content_json FROM mnt_setting WHERE id = 'default'"))[0].content_json, null, "bị từ chối thì KHÔNG ghi");
  r = await call(OWNER, "PUT", "/api/maintenance/content", MOI);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { on: false, endsAt: null, canToggle: true, content: MOI_LUU }, "lưu nội dung không bật bảo trì; SĐT đã bỏ dấu cách");
  assert.deepEqual((await call(OWNER, "GET", "/api/maintenance")).body.content, MOI_LUU);
  const ENDS2 = new Date(Date.now() + 20 * 60_000).toISOString();
  assert.equal((await call(OWNER, "PUT", "/api/maintenance", { on: true, endsAt: ENDS2 })).status, 200);
  r = await call(ACCOUNTANT, "GET", "/api/orders");
  assert.equal(r.status, 503);
  assert.deepEqual(r.body.error.content, MOI_LUU, "người bị chặn nhận đúng nội dung chủ đã lưu");
  assert.ok(r.body.error.message.endsWith("liên hệ quản trị viên khi cần hỗ trợ thêm (0905123456)."), `câu báo dùng SĐT đã lưu: ${r.body.error.message}`);
  assert.deepEqual((await call(null, "GET", "/api/auth/config")).body.maintenance, { on: true, endsAt: ENDS2, content: MOI_LUU }, "trang đăng nhập nhận nội dung đã lưu");
  assert.equal((await call(OWNER, "PUT", "/api/maintenance", { on: false })).status, 200);
  r = await call(OWNER, "GET", "/api/audit?action=maintenance_changed&limit=20");
  const dongNd = r.body.entries.filter((e) => e.at >= mocNd && e.detail.startsWith("Sửa nội dung màn bảo trì"));
  assert.equal(dongNd.length, 1, "một lần lưu thành công = một dòng nhật ký");
  assert.equal(dongNd[0].detail, "Sửa nội dung màn bảo trì: tiêu đề, nội dung bảo trì, số điện thoại hỗ trợ, liên kết Zalo, hiện thẻ website");
  assert.doesNotMatch(dongNd[0].detail, /\d{9,}/, "nhật ký không chép SĐT");
  console.log("✓ nội dung màn bảo trì: chỉ Toàn quyền sửa; đầu vào sai → 400 không ghi; 503 + câu báo + config dùng nội dung đã lưu; nhật ký chỉ tên ô");

  // --- 10) đường thoát khẩn: bật lại rồi tắt bằng MỘT câu SQL (như wrangler d1 execute --remote), không cần deploy
  r = await call(OWNER, "PUT", "/api/maintenance", { on: true, endsAt: new Date(Date.now() + 60 * 60_000).toISOString() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await call(ACCOUNTANT, "GET", "/api/auth/me")).status, 503);
  await sql("UPDATE mnt_setting SET enabled = 0 WHERE id = 'default'");
  assert.equal((await call(ACCOUNTANT, "GET", "/api/auth/me")).status, 200, "tắt bằng SQL có hiệu lực ngay");
  r = await call(null, "GET", "/api/auth/config");
  assert.deepEqual(r.body.maintenance, { on: false, endsAt: null }, "tắt bằng SQL: dù ends_at còn đó, giờ dự kiến không lộ ra khi tắt");
  console.log("✓ đường thoát khẩn: UPDATE mnt_setting SET enabled = 0 → vào lại được ngay");
} finally {
  await restore();
}
assert.deepEqual(await setting(), { enabled: 0, ends_at: null, allowed_phones: SEED_ALLOWED }, "phải trả cài đặt về nguyên trạng");
assert.equal((await sqlRows("SELECT content_json FROM mnt_setting WHERE id = 'default'"))[0].content_json, null, "nội dung màn bảo trì trả về mặc định");
console.log("E2E MAINTENANCE OK");
