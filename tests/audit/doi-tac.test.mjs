// Thử phá kịch bản ĐỐI TÁC NGOÀI đăng nhập (CTV, HDV, công ty du lịch — tới ~1000 tài khoản) — kiểm toán bổ sung 2026-09-22
// (docs/AUDIT-2026-09-22-DOI-TAC.md). Cùng quy ước với redteam.test.mjs: "PASS" = giữ được bất biến; "FINDING" = test khẳng định hành vi YẾU hiện tại
// (sửa phát hiện thì test ĐỎ → chuyển thành test hồi quy thật). Ngoài `npm test`. Chạy: node --test "tests/audit/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "./harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // nhân viên bán hàng của công ty
const ADM = "33333333-3333-4333-8333-333333333333"; // quản trị
const F = "44444444-4444-4444-8444-444444444444"; // hướng dẫn viên (quyền Hướng dẫn viên / FIELD)

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: F, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  // 2026-09-26 (DK-T3-01): API không nhận dịch vụ nhập tay mới → đơn thử dùng dịch vụ danh mục GIẢ (cùng số tiền 2 × 500.000 với dịch vụ nhập tay cũ).
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra = {}) => ({
  customerName: "Khách Riêng Của An", customerPhone: "0912345678",
  services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: inDays(3) }],
  depositAmount: 200000, depositMethod: "cash", ...extra,
});

/**
 * Quản trị tạo tài khoản cho một cộng tác viên, GÁN TƯỜNG MINH quyền Bán hàng (đúng cách màn quản trị luôn làm — đây là
 * kịch bản "lỡ gán Bán hàng cho người ngoài", KHÔNG phải mặc định của API — mặc định đã sửa ở D-02, xem test riêng dưới).
 * Trả { id, pin, perms }.
 */
async function createPartner(w, phone, body = {}) {
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Cộng Tác Viên", phone, permissions: ["SALES"], ...body } });
  assert.equal(r.status, 201, r.text);
  return { id: r.json.staff.id, pin: r.json.pin, perms: r.json.staff.permissions };
}

test("D-02 (đã sửa, ADR-0014 điều 7): POST /api/staff không kèm permissions → tài khoản không quyền nào (không còn tự động Bán hàng)", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Người Thử", phone: "0977000001" } }); // KHÔNG có trường permissions
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.staff.permissions, []);
});

test("P2 FINDING tách dữ liệu: tài khoản đối tác (Bán hàng) liệt kê được đơn của nhân viên khác, kèm tên + SĐT khách", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  const p = await createPartner(w, "0977000002");
  const list = await w.call("GET", "/api/orders?limit=100", { as: p.id });
  assert.equal(list.status, 200, list.text);
  const seen = list.json.orders.find((x) => x.id === o.id);
  assert.ok(seen, "đối tác thấy đơn của An");
  assert.equal(seen.customerPhone, "0912345678");
  // Tìm theo SĐT bất kỳ cũng được — tức dò được khách của người khác bằng số điện thoại.
  const byPhone = await w.call("GET", "/api/orders?q=0912345678", { as: p.id });
  assert.equal(byPhone.json.orders.length, 1);
  // Chi tiết đơn (dịch vụ, tiền) cũng mở.
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: p.id })).status, 200);
});

test("P3 FINDING tách dữ liệu: đối tác liệt kê + tra theo SĐT toàn bộ danh bạ hồ sơ (khách, đại lý, nhân viên) và SỬA được hồ sơ khách của người khác", async () => {
  const w = setup();
  await w.call("POST", "/api/orders", { as: A, body: orderBody({ newBooker: { fullName: "Trần Khách", phone: "0912345678" } }) });
  const p = await createPartner(w, "0977000003");
  const list = await w.call("GET", "/api/parties?limit=100", { as: p.id });
  assert.equal(list.status, 200, list.text);
  const khach = list.json.parties.find((x) => x.displayName === "Trần Khách");
  assert.ok(khach);
  assert.equal(khach.primaryPhone, "0912345678");
  assert.ok(list.json.parties.some((x) => x.displayName === "Quản trị"), "thấy cả hồ sơ nhân viên");
  const look = await w.call("GET", "/api/parties/lookup?phone=0912345678", { as: p.id });
  assert.equal(look.json.matches.length, 1);
  const cur = (await w.call("GET", `/api/parties/${khach.id}`, { as: p.id })).json.party;
  const put = await w.call("PUT", `/api/parties/${khach.id}`, { as: p.id, body: { familyName: null, middleName: null, givenName: "Đã Bị Sửa", active: true, expectedUpdatedAt: cur.updatedAt } });
  assert.equal(put.status, 200, put.text);
});

test("P4 FINDING HDV: tài khoản chỉ quyền Hướng dẫn viên không mở được đơn nào (kể cả để xem việc), và không được giao phụ trách", async () => {
  const w = setup();
  const o = (await w.call("POST", "/api/orders", { as: A, body: orderBody() })).json.order;
  assert.equal((await w.call("GET", "/api/orders", { as: F })).status, 403);
  assert.equal((await w.call("GET", `/api/orders/${o.id}`, { as: F })).status, 403);
  const assign = await w.call("PUT", `/api/orders/${o.id}/handler`, { as: ADM, body: { staffId: F } });
  assert.equal(assign.status, 400, assign.text);
  assert.match(assign.json.error.message, /Chỉ giao phụ trách cho người có quyền Bán hàng hoặc Quản trị/);
});

test("P5 FINDING khoá tài khoản: ai biết SĐT của đối tác làm sai PIN 5 lần là khoá được người đó 15 phút (PIN đúng cũng bị 429)", async () => {
  const w = setup();
  const p = await createPartner(w, "0977000005");
  for (let i = 0; i < 5; i++) {
    const bad = await w.call("POST", "/api/auth/login", { body: { phone: "0977000005", pin: "000000" === p.pin ? "111111" : "000000" }, headers: { "cf-connecting-ip": `203.0.113.${i + 1}` } });
    assert.equal(bad.status, 401, bad.text);
  }
  const good = await w.call("POST", "/api/auth/login", { body: { phone: "0977000005", pin: p.pin }, headers: { "cf-connecting-ip": "198.51.100.7" } });
  assert.equal(good.status, 429, good.text);
});

test("P6 FINDING dùng chung IP: 30 lần sai trong 15 phút từ MỘT IP (vd wifi văn phòng một công ty du lịch, NAT nhà mạng 4G) chặn mọi tài khoản khác sau cùng IP", async () => {
  const w = setup();
  const p = await createPartner(w, "0977000006");
  const ip = { "cf-connecting-ip": "203.0.113.200" };
  for (let i = 0; i < 30; i++) {
    const phone = `09880000${String(i).padStart(2, "0")}`; // 30 SĐT khác nhau, mỗi số sai 1 lần → không số nào tự bị khoá
    await w.call("POST", "/api/auth/login", { body: { phone, pin: "123456" }, headers: ip });
  }
  const good = await w.call("POST", "/api/auth/login", { body: { phone: "0977000006", pin: p.pin }, headers: ip });
  assert.equal(good.status, 429, good.text);
});

test("D-01 (đã sửa, ADR-0014): tài khoản Đối tác liệt kê đơn chỉ thấy đơn của chính mình", async () => {
  const w = setup();
  const P1 = "55555555-5555-4555-8555-555555555555";
  const P2 = "66666666-6666-4666-8666-666666666666";
  seedStaff(w.sqlite, { id: P1, phone: "0977100001", name: "Đối Tác Một", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: P2, phone: "0977100002", name: "Đối Tác Hai", perms: ["PARTNER"] });
  const o1 = (await w.call("POST", "/api/orders", { as: P1, body: orderBody() })).json.order;
  const o2 = (await w.call("POST", "/api/orders", { as: P2, body: orderBody() })).json.order;
  const list = await w.call("GET", "/api/orders?limit=100", { as: P1 });
  assert.equal(list.status, 200, list.text);
  const ids = list.json.orders.map((x) => x.id);
  assert.ok(ids.includes(o1.id), "thấy đơn của chính mình");
  assert.ok(!ids.includes(o2.id), "KHÔNG thấy đơn của đối tác khác");
  // Tìm theo SĐT của đơn người khác cũng không ra.
  const byPhone = await w.call("GET", "/api/orders?q=0912345678", { as: P1 });
  assert.equal(byPhone.json.orders.length, 1, "chỉ thấy đúng đơn của mình dù trùng SĐT khách");
});

test("D-01 (đã sửa, ADR-0014): tài khoản Đối tác xem chi tiết đơn của người khác bị từ chối", async () => {
  const w = setup();
  const P1 = "77777777-7777-4777-8777-777777777777";
  const P2 = "88888888-8888-4888-8888-888888888888";
  seedStaff(w.sqlite, { id: P1, phone: "0977100003", name: "Đối Tác Ba", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: P2, phone: "0977100004", name: "Đối Tác Bốn", perms: ["PARTNER"] });
  const o2 = (await w.call("POST", "/api/orders", { as: P2, body: orderBody() })).json.order;
  const res = await w.call("GET", `/api/orders/${o2.id}`, { as: P1 });
  assert.equal(res.status, 403, res.text);
  // Chính chủ vẫn xem được bình thường.
  const own = await w.call("GET", `/api/orders/${o2.id}`, { as: P2 });
  assert.equal(own.status, 200, own.text);
});

test("D-01 (đã sửa, ADR-0014): tài khoản Đối tác vẫn KHÔNG vào được /api/parties (party.view/party.write = none)", async () => {
  const w = setup();
  const P1 = "99999999-9999-4999-8999-999999999999";
  seedStaff(w.sqlite, { id: P1, phone: "0977100005", name: "Đối Tác Năm", perms: ["PARTNER"] });
  assert.equal((await w.call("GET", "/api/parties?limit=100", { as: P1 })).status, 403);
  assert.equal((await w.call("GET", "/api/parties/lookup?phone=0912345678", { as: P1 })).status, 403);
});

test("P7 ĐO quy mô: 1000 tài khoản Bán hàng → danh sách người-được-giao trả CẢ 1000 tên cho MỌI tài khoản văn phòng (không chia trang)", async () => {
  const w = setup();
  const me = "aaaaaaaa-aaaa-4aaa-8aaa-000000000007";
  w.sqlite.exec("BEGIN");
  for (let i = 0; i < 1000; i++) {
    const id = `aaaaaaaa-aaaa-4aaa-8aaa-${String(i).padStart(12, "0")}`;
    seedStaff(w.sqlite, { id, phone: `096${String(i).padStart(7, "0")}`, name: `Doi Tac ${i}`, perms: ["SALES"] });
  }
  w.sqlite.exec("COMMIT");
  const t0 = performance.now();
  const r = await w.call("GET", "/api/dispatch/assignees", { as: me });
  const ms = performance.now() - t0;
  assert.equal(r.status, 200, r.text);
  console.log(`P7 assignees: ${r.json.assignees.length} người, ${r.text.length} byte, ${ms.toFixed(0)} ms (SQLite trong bộ nhớ, KHÔNG phải D1 thật)`);
  assert.ok(r.json.assignees.length >= 1000, "một đối tác thấy tên của mọi đối tác khác");
  const t1 = performance.now();
  const who = await w.call("GET", "/api/auth/me", { as: me });
  console.log(`P7 /api/auth/me với 1000 tài khoản: ${(performance.now() - t1).toFixed(0)} ms`);
  assert.equal(who.status, 200);
});

// --- Điều 8 (ADR-0014): Admin chỉ quản lý tài khoản cấp dưới, không đụng Admin/Super Admin khác ------------------------
function setupRank() {
  const w = setup();
  const OTHER_ADMIN = "aaaaaaaa-0000-4000-8000-000000000001";
  const SUPER = "aaaaaaaa-0000-4000-8000-000000000002";
  const TARGET_SALES = "aaaaaaaa-0000-4000-8000-000000000003";
  seedStaff(w.sqlite, { id: OTHER_ADMIN, phone: "0966000001", name: "Admin Khác", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUPER, phone: "0966000002", name: "Super Admin", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: TARGET_SALES, phone: "0966000003", name: "Nhân Viên", perms: ["SALES"] });
  return { w, OTHER_ADMIN, SUPER, TARGET_SALES };
}

test("Điều 8: ADMIN không đình chỉ được một ADMIN khác; SUPER_ADMIN thì được", async () => {
  const { w, OTHER_ADMIN, SUPER } = setupRank();
  const asAdmin = await w.call("PATCH", `/api/staff/${OTHER_ADMIN}`, { as: ADM, body: { active: false } });
  assert.equal(asAdmin.status, 403, asAdmin.text);
  const asSuper = await w.call("PATCH", `/api/staff/${OTHER_ADMIN}`, { as: SUPER, body: { active: false } });
  assert.equal(asSuper.status, 200, asSuper.text);
});

test("Điều 8: ADMIN đình chỉ được tài khoản cấp dưới (Bán hàng)", async () => {
  const { w, TARGET_SALES } = setupRank();
  const res = await w.call("PATCH", `/api/staff/${TARGET_SALES}`, { as: ADM, body: { active: false } });
  assert.equal(res.status, 200, res.text);
});

test("Điều 8 (admin.manage.superadmin): ADMIN không cấp được SUPER_ADMIN cho ai; SUPER_ADMIN thì được", async () => {
  const { w, SUPER, TARGET_SALES } = setupRank();
  const asAdmin = await w.call("PUT", `/api/staff/${TARGET_SALES}/permissions`, { as: ADM, body: { permissions: ["SALES", "SUPER_ADMIN"] } });
  assert.equal(asAdmin.status, 403, asAdmin.text);
  const asSuper = await w.call("PUT", `/api/staff/${TARGET_SALES}/permissions`, { as: SUPER, body: { permissions: ["SALES", "SUPER_ADMIN"] } });
  assert.equal(asSuper.status, 200, asSuper.text);
});

test("P0 (đã vá, phát hiện lúc kiểm độc lập): ADMIN không tự CẤP MỚI được tài khoản SUPER_ADMIN qua POST /api/staff; SUPER_ADMIN thì được", async () => {
  const w = setup();
  const asAdmin = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Tự Tạo Super", phone: "0977200001", permissions: ["SUPER_ADMIN"] } });
  assert.equal(asAdmin.status, 403, asAdmin.text);
  const asAdminMixed = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Tự Tạo Super 2", phone: "0977200002", permissions: ["SALES", "SUPER_ADMIN"] } });
  assert.equal(asAdminMixed.status, 403, asAdminMixed.text);
  const SUPER = "22222222-2222-4222-8222-222222222222";
  seedStaff(w.sqlite, { id: SUPER, phone: "0900000009", name: "Super Admin", perms: ["SUPER_ADMIN"] });
  const asSuper = await w.call("POST", "/api/staff", { as: SUPER, body: { fullName: "Tạo Bởi Super", phone: "0977200003", permissions: ["SUPER_ADMIN"] } });
  assert.equal(asSuper.status, 201, asSuper.text);
  assert.deepEqual(asSuper.json.staff.permissions, ["SUPER_ADMIN"]);
});

test("Điều 8: ADMIN không unlock/reset-pin được một ADMIN khác; SUPER_ADMIN thì được", async () => {
  const { w, OTHER_ADMIN, SUPER } = setupRank();
  assert.equal((await w.call("POST", `/api/staff/${OTHER_ADMIN}/unlock`, { as: ADM })).status, 403);
  assert.equal((await w.call("POST", `/api/staff/${OTHER_ADMIN}/unlock`, { as: SUPER })).status, 200);
  assert.equal((await w.call("POST", `/api/staff/${OTHER_ADMIN}/reset-pin`, { as: ADM })).status, 403);
  assert.equal((await w.call("POST", `/api/staff/${OTHER_ADMIN}/reset-pin`, { as: SUPER })).status, 200);
});

test("DK-T3-02 (kiểm toán 24/9, đã vá): Quản trị/Toàn quyền KHÔNG tự đặt lại PIN của chính mình — 403 TRƯỚC mọi ghi; vẫn đặt lại được cho cấp dưới", async () => {
  const { w, SUPER, TARGET_SALES } = setupRank();
  for (const self of [ADM, SUPER]) {
    const before = w.q("SELECT pin_hash, credentials_changed_at FROM staff WHERE id = ?", self);
    const auditBefore = w.q("SELECT COUNT(*) AS n FROM audit_log")[0].n;
    const r = await w.call("POST", `/api/staff/${self}/reset-pin`, { as: self });
    assert.equal(r.status, 403, r.text);
    assert.equal(r.json.error.code, "forbidden");
    assert.match(r.json.error.message, /Đổi mã PIN/);
    assert.equal(r.json.pin, undefined, "không trả PIN");
    assert.deepEqual(w.q("SELECT pin_hash, credentials_changed_at FROM staff WHERE id = ?", self), before, "PIN và mốc đổi thông tin đăng nhập giữ nguyên");
    assert.equal(w.q("SELECT COUNT(*) AS n FROM audit_log")[0].n, auditBefore, "không có dòng nhật ký nào");
    assert.equal((await w.call("GET", "/api/auth/me", { as: self })).status, 200, "phiên vẫn hợp lệ");
  }
  const ok = await w.call("POST", `/api/staff/${TARGET_SALES}/reset-pin`, { as: ADM });
  assert.equal(ok.status, 200, ok.text);
  assert.match(ok.json.pin, /^\d{6}$/);
});
