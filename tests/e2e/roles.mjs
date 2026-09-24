// E2E vai & quyền (ADR-0018 giai đoạn 1) trên API THẬT: gán vai sinh quyền, chỉnh tay có lý do, luật cứng LC-1/LC-3/LC-4, route cũ bị khoá với tài khoản
// đã gán vai, tạo tài khoản trên hồ sơ có sẵn, Thực tập sinh chỉ thấy đơn của mình, nhật ký có dòng đổi vai (không chứa SĐT). Chạy qua tests/e2e/run.mjs.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, orderInput, randomPhone as rnd, session, sql, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SUPER = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);

// ---- 1. Tạo theo vai: quyền = bộ mặc định; hồ sơ mang đúng vai (không còn vai STAFF cũ)
let r = await call(ADMIN, "POST", "/api/staff", { fullName: "Kế Toán Vai", phone: rnd(), roles: ["ACCOUNTANT"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING"]);
assert.deepEqual(r.body.staff.roles, ["ACCOUNTANT"]);
const K = r.body.staff;
r = await call(ADMIN, "GET", `/api/parties/${K.partyId}`);
assert.deepEqual(r.body.party.roleCodes, ["ACCOUNTANT"]);
console.log("✓ tạo tài khoản theo vai: quyền = bộ mặc định, hồ sơ mang đúng vai");

// ---- 1b (Ruling R17): route CŨ (module parties) không gỡ được vai đã gán qua tài khoản — chỉ trang Nhân viên/API vai mới làm được.
const acctRole = r.body.party.roles.find((x) => x.roleTypeCode === "ACCOUNTANT" && x.validTo === null);
assert.ok(acctRole, "hồ sơ phải có dòng vai Kế toán đang mở");
r = await call(ADMIN, "POST", `/api/parties/${K.partyId}/roles/${acctRole.id}/end`, {});
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "role_via_account");
console.log("✓ route cũ /api/parties/:id/roles/:rid/end khoá với vai gán qua tài khoản (role_via_account)");

// ---- 2. Xem + đổi vai; chỉnh tay phải có lý do; nhật ký ghi trước → sau và KHÔNG chứa SĐT
r = await call(ADMIN, "GET", `/api/staff/${K.id}/roles`);
assert.deepEqual(r.body, { roles: ["ACCOUNTANT"], adds: [], removes: [], reason: null });
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"] })).status, 400, "chỉnh tay thiếu lý do");
r = await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], reason: "kiêm nhiệm kế toán tạm thời" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SALES", "ACCOUNTING"]);
assert.deepEqual(r.body.staff.roles, ["SALES_STAFF"]);
r = await call(ADMIN, "GET", `/api/staff/${K.id}/roles`);
assert.deepEqual(r.body, { roles: ["SALES_STAFF"], adds: ["ACCOUNTING"], removes: [], reason: "kiêm nhiệm kế toán tạm thời" });
const [log] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'account_roles_changed' AND target_id = '${K.id}' ORDER BY created_at DESC LIMIT 1`);
assert.match(log.detail, /vai: Kế toán → Nhân viên kinh doanh/);
assert.match(log.detail, /lý do: kiêm nhiệm kế toán tạm thời/);
assert.ok(!log.detail.includes(K.phone), "nhật ký không chứa SĐT");
console.log("✓ đổi vai + chỉnh tay có lý do; nhật ký ghi trước → sau, không chứa SĐT");

// ---- 3. Luật cứng
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF", "COLLABORATOR"] })).status, 400, "LC-3: lẫn hai nhóm");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["COLLABORATOR"], adds: ["SALES"], reason: "x" })).status, 400, "LC-1: cộng tay quyền nội bộ cho tài khoản bên ngoài");
r = await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["COLLABORATOR"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["PARTNER"], "đổi sang vai bên ngoài trong một lần lưu: chỉ còn Đối tác (Review Focus 1)");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["OPERATIONS_MANAGER"] })).status, 403, "LC-4: Quản trị không gán vai Điều hành");
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"], adds: ["ADMIN"], reason: "x" })).status, 403, "LC-4: cộng tay Quản trị");
assert.equal((await call(ADMIN, "POST", "/api/staff", { fullName: "Quản Trị Mới", phone: rnd(), permissions: ["ADMIN"] })).status, 403, "LC-4: tạo tài khoản có Quản trị (đường cũ)");
assert.equal((await call(ADMIN, "POST", "/api/staff", { fullName: "Điều Hành Mới", phone: rnd(), roles: ["OPERATIONS_MANAGER"] })).status, 403, "LC-4: tạo tài khoản vai Điều hành");
r = await call(SUPER, "PUT", `/api/staff/${K.id}/roles`, { roles: ["OPERATIONS_MANAGER"] });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ADMIN"]);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${K.id}/roles`, { roles: ["SALES_STAFF"] })).status, 403, "Quản trị không quản lý tài khoản Quản trị khác");
assert.equal((await call(SALES, "GET", `/api/staff/${K.id}/roles`)).status, 403);
console.log("✓ luật cứng LC-1, LC-3, LC-4 ở API thật");

// ---- 4. Route cũ bị khoá với tài khoản đã gán vai; vẫn chạy (kèm LC-4) với tài khoản chưa gán vai
r = await call(SUPER, "PUT", `/api/staff/${K.id}/permissions`, { permissions: ["SALES"] });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "role_managed");
const legacy = await call(ADMIN, "POST", "/api/staff", { fullName: "Tài Khoản Cũ", phone: rnd(), permissions: ["SALES"] });
assert.equal(legacy.status, 201);
assert.deepEqual(legacy.body.staff.roles, []);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${legacy.body.staff.id}/permissions`, { permissions: ["SALES", "ACCOUNTING"] })).status, 200);
assert.equal((await call(ADMIN, "PUT", `/api/staff/${legacy.body.staff.id}/permissions`, { permissions: ["SALES", "ADMIN"] })).status, 403, "LC-4 cả ở route cũ");
console.log("✓ route cũ: khoá với tài khoản đã gán vai; LC-4 áp mọi tài khoản");

// ---- 5. Toàn quyền tự gán vai cho chính mình (Review Focus 5)
const me = (await call(SUPER, "GET", "/api/auth/me")).body.staff;
assert.equal((await call(SUPER, "PUT", `/api/staff/${me.id}/roles`, { roles: ["DIRECTOR"] })).status, 409, "quyền đổi (thêm Quản trị) → không tự đổi quyền");
r = await call(SUPER, "PUT", `/api/staff/${me.id}/roles`, { roles: ["DIRECTOR"], removes: ["ADMIN"], reason: "tài khoản thử chỉ giữ Toàn quyền" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SUPER_ADMIN"]);
assert.deepEqual(r.body.staff.roles, ["DIRECTOR"]);
console.log("✓ tự gán vai: quyền không đổi thì cho, đổi thì 409");

// ---- 6. Tạo tài khoản trên hồ sơ có sẵn
const kh = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: "Lễ Tân Có Sẵn", contacts: [] });
assert.equal(kh.status, 201, JSON.stringify(kh.body));
r = await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["HOTEL_RECEPTION"], partyId: kh.body.party.id });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.staff.partyId, kh.body.party.id);
assert.equal(r.body.staff.fullName, "Lễ Tân Có Sẵn");
assert.deepEqual(r.body.staff.permissions, ["PARTNER"]);
assert.equal((await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["HOTEL_RECEPTION"], partyId: kh.body.party.id })).status, 409, "hồ sơ đã có tài khoản");
console.log("✓ tạo tài khoản trên hồ sơ có sẵn, không tạo hồ sơ trùng");

// ---- 6b (Ruling R26): hồ sơ có sẵn đang giữ vai tài khoản (dữ liệu cũ — trang Hồ sơ nay không gán được) → phải chọn cả vai đó; quyền = hợp các vai.
const kt = await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: "Kế Toán Có Sẵn", contacts: [] });
assert.equal(kt.status, 201, JSON.stringify(kt.body));
const ktId = kt.body.party.id;
await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('e2e-r26-${ktId}', '${ktId}', 'ACCOUNTANT', NULL, '2026-09-01', '2026-09-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z')`);
r = await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["SALES_STAFF"], partyId: ktId });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "account_rule");
assert.equal(r.body.error.message, "Hồ sơ này đang giữ vai Kế toán: chọn cả vai này (hoặc đổi vai sau khi tạo).");
r = await call(ADMIN, "POST", "/api/staff", { phone: rnd(), roles: ["SALES_STAFF", "ACCOUNTANT"], partyId: ktId });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["SALES", "ACCOUNTING"]);
assert.deepEqual(r.body.staff.roles, ["SALES_STAFF", "ACCOUNTANT"]);
const [{ n: ktRows }] = await sqlRows(`SELECT count(*) AS n FROM pty_party_role WHERE party_id = '${ktId}' AND role_type_code = 'ACCOUNTANT'`);
assert.equal(ktRows, 1, "không chèn trùng vai Kế toán");
console.log("✓ hồ sơ có sẵn giữ vai tài khoản: thiếu vai → 409 account_rule; chọn đủ → quyền = hợp, không trùng vai");

// ---- 7. Thực tập sinh: lập đơn, chỉ thấy đơn của mình
const ttsPhone = rnd();
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Thực Tập Sinh", phone: ttsPhone, roles: ["INTERN"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["INTERN"]);
const TTS = (await login(ttsPhone, r.body.pin)).cookie;
const other = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(other.status, 201, JSON.stringify(other.body));
const mine = await call(TTS, "POST", "/api/orders", orderInput({ customerName: "Khách Của Thực Tập" }));
assert.equal(mine.status, 201, JSON.stringify(mine.body));
r = await call(TTS, "GET", "/api/orders");
assert.equal(r.status, 200);
assert.ok(r.body.orders.length >= 1 && r.body.orders.every((o) => o.id === mine.body.order.id), "chỉ thấy đơn của mình");
assert.notEqual((await call(TTS, "GET", `/api/orders/${other.body.order.id}`)).status, 200, "không mở được đơn người khác");
assert.equal((await call(TTS, "GET", "/api/orders/dashboard")).status, 403, "không có Trang chủ văn phòng");
assert.equal((await call(TTS, "GET", "/api/staff")).status, 403);
console.log("✓ Thực tập sinh: lập đơn, chỉ thấy đơn của mình");

console.log("E2E ROLES OK");
