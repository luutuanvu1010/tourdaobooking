// Thử phá kịch bản ĐỐI TÁC NGOÀI đăng nhập (CTV, HDV, công ty du lịch — tới ~1000 tài khoản) — kiểm toán bổ sung 2026-09-22
// (docs/AUDIT-2026-09-22-DOI-TAC.md). Cùng quy ước với redteam.test.mjs: "PASS" = giữ được bất biến; "FINDING" = test khẳng định hành vi YẾU hiện tại
// (sửa phát hiện thì test ĐỎ → chuyển thành test hồi quy thật). Ngoài `npm test`. Chạy: node --test "tests/audit/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { world, seedStaff } from "./harness.mjs";

const A = "11111111-1111-4111-8111-111111111111"; // nhân viên bán hàng của công ty
const ADM = "33333333-3333-4333-8333-333333333333"; // quản trị
const F = "44444444-4444-4444-8444-444444444444"; // hướng dẫn viên (quyền Thực hiện)

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: F, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  return w;
}
const inDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const orderBody = (extra = {}) => ({
  customerName: "Khách Riêng Của An", customerPhone: "0912345678",
  services: [{ kind: "manual", name: "Tour đảo", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, departDate: inDays(3), items: [{ description: "Vé", quantity: 2, unitPrice: 500000 }] }],
  depositAmount: 200000, depositMethod: "cash", ...extra,
});

/** Quản trị tạo tài khoản cho một cộng tác viên như cách duy nhất hiện có (POST /api/staff). Trả { id, pin, perms }. */
async function createPartner(w, phone, body = {}) {
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Cộng Tác Viên", phone, ...body } });
  assert.equal(r.status, 201, r.text);
  return { id: r.json.staff.id, pin: r.json.pin, perms: r.json.staff.permissions };
}

test("P1 FINDING mặc định: tài khoản mới không ghi quyền → quyền Bán hàng (thấy mọi đơn, mọi khách)", async () => {
  const w = setup();
  const p = await createPartner(w, "0977000001");
  assert.deepEqual(p.perms, ["SALES"]);
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

test("P4 FINDING HDV: tài khoản chỉ quyền Thực hiện không mở được đơn nào (kể cả để xem việc), và không được giao phụ trách", async () => {
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
