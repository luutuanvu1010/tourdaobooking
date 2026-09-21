// Người đặt trên đơn (N2 lát 1, ADR-0011): bỏ qua / gắn hồ sơ có sẵn / tạo hồ sơ mới cùng lúc lưu đơn; máy chủ không tin id từ trình duyệt; nhật ký không lộ SĐT.
import assert from "node:assert/strict";
import { ACCOUNTS, call, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const tag = String(Date.now()).slice(-6);
const person = async (fullName, phone = randomPhone()) => {
  const r = await call(SALES, "POST", "/api/parties", { kind: "PERSON", fullName, contacts: [{ kind: "PHONE", value: phone }] });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.party;
};

// 1) không gắn: đơn vẫn lưu (câu hỏi A)
let r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
assert.equal(r.body.order.bookerName, null);
console.log("✓ lập đơn không gắn hồ sơ khách");

// 2) gắn hồ sơ có sẵn: tên/SĐT trên đơn là bản chụp, không ghi ngược vào hồ sơ
const phoneA = randomPhone();
const existing = await person(`Khách Có Sẵn ${tag}`, phoneA);
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: "Tên gõ trên đơn", customerPhone: phoneA, bookerPartyId: existing.id }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const linked = r.body.order;
assert.equal(linked.bookerPartyId, existing.id);
assert.equal(linked.bookerName, existing.displayName);
assert.equal(linked.customerName, "Tên gõ trên đơn");
assert.equal((await call(SALES, "GET", `/api/parties/${existing.id}`)).body.party.displayName, existing.displayName, "không ghi ngược tên vào hồ sơ");
assert.equal((await call(SALES, "GET", `/api/orders/${linked.id}`)).body.order.bookerName, existing.displayName, "GET đơn đọc được người đặt");
console.log("✓ gắn hồ sơ có sẵn; tên/SĐT trên đơn là bản chụp");

// 3) tạo hồ sơ mới cùng lúc lưu đơn: có vai CUSTOMER, SĐT chính; nhật ký party_created + created, không có SĐT
const phoneN = randomPhone();
r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Mới ${tag}`, customerPhone: phoneN, newBooker: { fullName: `Khách Mới ${tag}`, phone: phoneN } }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const withNew = r.body.order;
assert.ok(withNew.bookerPartyId, "đơn phải trỏ hồ sơ mới");
const made = (await call(SALES, "GET", `/api/parties/${withNew.bookerPartyId}`)).body.party;
assert.equal(made.displayName, `Khách Mới ${tag}`);
assert.deepEqual(made.roleCodes, ["CUSTOMER"]);
assert.equal(made.primaryPhone, phoneN);
const logs = await sqlRows(`SELECT action, detail FROM audit_log WHERE target_id = '${withNew.bookerPartyId}' OR order_id = '${withNew.id}'`);
assert.ok(logs.some((a) => a.action === "party_created"), JSON.stringify(logs));
assert.ok(logs.some((a) => a.action === "created" && /gắn hồ sơ khách/.test(a.detail ?? "")), JSON.stringify(logs));
assert.ok(logs.every((a) => !String(a.detail ?? "").includes(phoneN)), "nhật ký không chứa SĐT");
console.log("✓ tạo hồ sơ mới + vai CUSTOMER cùng lúc lưu đơn; nhật ký không lộ SĐT");

// 4) đơn không hợp lệ thì KHÔNG tạo hồ sơ
const ghost = `Không Được Tạo ${tag}`;
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [], newBooker: { fullName: ghost, phone: randomPhone() } }));
assert.equal(r.status, 400);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM pty_party WHERE display_name = '${ghost}'`))[0].n, 0);
console.log("✓ đơn lỗi thì không có hồ sơ mồ côi");

// 5) máy chủ không tin id: không tồn tại / sai dạng / tổ chức / đã ngưng → 400
for (const bad of ["00000000-0000-0000-0000-000000000000", "khong-phai-id"]) {
  r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: bad }));
  assert.equal(r.status, 400, bad);
}
const org = (await call(SALES, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại lý ${tag}` })).body.party;
r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: org.id }));
assert.equal(r.status, 400);
assert.match(r.body.error.message, /đại lý/);
const stopped = await person(`Đã Ngưng ${tag}`);
await sql(`UPDATE pty_party SET active = 0 WHERE id = '${stopped.id}'`);
r = await call(SALES, "POST", "/api/orders", orderInput({ bookerPartyId: stopped.id }));
assert.equal(r.status, 400);
assert.match(r.body.error.message, /không còn dùng được/);
console.log("✓ id lạ/sai dạng/tổ chức/đã ngưng bị từ chối");

// 6) sửa nháp: đổi hồ sơ (nhật ký 'đổi hồ sơ khách'), rồi bỏ gắn
r = await call(SALES, "PUT", `/api/orders/${linked.id}`, orderInput({ customerName: linked.customerName, customerPhone: linked.customerPhone, bookerPartyId: withNew.bookerPartyId, expectedUpdatedAt: linked.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, withNew.bookerPartyId);
const upd = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${linked.id}' AND action = 'updated'`);
assert.ok(upd.some((a) => /đổi hồ sơ khách/.test(a.detail ?? "")), JSON.stringify(upd));
r = await call(SALES, "PUT", `/api/orders/${linked.id}`, orderInput({ bookerPartyId: null, expectedUpdatedAt: r.body.order.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
console.log("✓ sửa nháp: đổi và bỏ gắn hồ sơ khách");

// 7) đơn đã xác nhận: PUT đơn vẫn 409 not_editable (đổi khách đi đường riêng — Task 5)
r = await call(SALES, "POST", `/api/orders/${withNew.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const confirmed = r.body.order;
r = await call(SALES, "PUT", `/api/orders/${confirmed.id}`, orderInput({ bookerPartyId: null, expectedUpdatedAt: confirmed.updatedAt }));
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "not_editable");
console.log("✓ đơn đã xác nhận không sửa qua PUT đơn");
