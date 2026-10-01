// Người đặt trên đơn (N2 lát 1, ADR-0011): bỏ qua / gắn hồ sơ có sẵn / tạo hồ sơ mới cùng lúc lưu đơn; máy chủ không tin id từ trình duyệt; nhật ký không lộ SĐT.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows } from "./lib.mjs";

await ensureFakeCatalog(); // orderInput() dùng dịch vụ danh mục giả ZE1 (API không nhận dịch vụ nhập tay mới — 2026-09-26)

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

// 6b) sửa nháp kèm TẠO hồ sơ mới trong CHÍNH lượt PUT (booker.before không rỗng — nhánh chỉ số trả về của updateDraftOrder)
const draft6b = (await call(SALES, "POST", "/api/orders", orderInput())).body.order;
const pN2 = randomPhone();
r = await call(SALES, "PUT", `/api/orders/${draft6b.id}`, orderInput({ newBooker: { fullName: `Khách Sửa ${tag}`, phone: pN2 }, expectedUpdatedAt: draft6b.updatedAt }));
assert.equal(r.status, 200, JSON.stringify(r.body));
const withNew6b = r.body.order;
assert.ok(withNew6b.bookerPartyId, "đơn phải trỏ hồ sơ vừa tạo trong PUT");
assert.equal(withNew6b.bookerName, `Khách Sửa ${tag}`);
const made6b = (await call(SALES, "GET", `/api/parties/${withNew6b.bookerPartyId}`)).body.party;
assert.deepEqual(made6b.roleCodes, ["CUSTOMER"]);
assert.equal(made6b.primaryPhone, pN2);
const upd6b = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${draft6b.id}' AND action = 'updated'`);
assert.ok(upd6b.some((a) => /gắn hồ sơ khách/.test(a.detail ?? "")), JSON.stringify(upd6b));
const logs6b = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${draft6b.id}' OR target_id = '${withNew6b.bookerPartyId}'`);
assert.ok(logs6b.every((a) => !String(a.detail ?? "").includes(pN2)), "nhật ký không chứa SĐT");
// Mốc cũ (đã bị lượt trên thay) + tạo hồ sơ mới KHÁC → phải thua khoá lạc quan (409 stale), KHÔNG được ghi đè.
const pN3 = randomPhone();
r = await call(SALES, "PUT", `/api/orders/${draft6b.id}`, orderInput({ newBooker: { fullName: `Khách Mốc Cũ ${tag}`, phone: pN3 }, expectedUpdatedAt: draft6b.updatedAt }));
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "stale");
const after6b = (await call(SALES, "GET", `/api/orders/${draft6b.id}`)).body.order;
assert.equal(after6b.bookerPartyId, withNew6b.bookerPartyId, "thua khoá lạc quan thì KHÔNG đổi người đặt trên đơn");
// Giới hạn đã biết (ghi trong repository.ts): hồ sơ MỚI trong booker.before không mang điều kiện thắng của khoá lạc quan —
// còn đúng khi hai lượt lưu ĐUA NHAU thật. Từ 1.63 (PM-1), mốc cũ đến SAU bị bắt 409 ở route TRƯỚC khi dựng lô ⇒ ca này
// (lưu tuần tự bằng mốc cũ) không còn tạo hồ sơ thừa nào.
assert.equal((await sqlRows(`SELECT count(*) AS n FROM pty_party WHERE display_name = 'Khách Mốc Cũ ${tag}'`))[0].n, 0, "mốc cũ bị bắt sớm (PM-1) ⇒ không tạo hồ sơ thừa");
console.log("✓ sửa nháp kèm tạo hồ sơ mới; mốc cũ + hồ sơ mới khác → 409 stale, không ghi đè người đặt");

// 6c) sửa nháp mà thân yêu cầu KHÔNG có cả hai khoá bookerPartyId/newBooker (client cũ chưa biết trường người đặt) → GIỮ NGUYÊN người đặt, không bỏ gắn
const before6c = after6b.bookerPartyId;
const body6c = orderInput({ expectedUpdatedAt: after6b.updatedAt });
assert.ok(!("bookerPartyId" in body6c) && !("newBooker" in body6c), "kịch bản phải không có cả hai khoá người đặt");
r = await call(SALES, "PUT", `/api/orders/${draft6b.id}`, body6c);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, before6c, "vắng cả hai khoá phải GIỮ NGUYÊN người đặt (không bỏ gắn)");
const upd6c = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${draft6b.id}' AND action = 'updated' ORDER BY created_at DESC LIMIT 1`);
assert.ok(!/bỏ gắn/.test(upd6c[0]?.detail ?? ""), JSON.stringify(upd6c));
console.log("✓ PUT đơn vắng cả hai khoá người đặt: giữ nguyên (không bỏ gắn) — bảo vệ client cũ");

// 7) đơn đã xác nhận: PUT đơn vẫn 409 not_editable (đổi khách đi đường riêng — Task 5)
r = await call(SALES, "POST", `/api/orders/${withNew.id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const confirmed = r.body.order;
r = await call(SALES, "PUT", `/api/orders/${confirmed.id}`, orderInput({ bookerPartyId: null, expectedUpdatedAt: confirmed.updatedAt }));
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "not_editable");
console.log("✓ đơn đã xác nhận không sửa qua PUT đơn");

// ---- Đổi khách của đơn ĐÃ XÁC NHẬN (ADR-0011 điều 2: như thông tin vận hành, quyền order.trip.edit) ----
const OTHER = await session(ACCOUNTS.salesB); // không phải người lập, không phụ trách
const ACC = await session(ACCOUNTS.accountant);
const ADMIN = await session(ACCOUNTS.admin);
const B = (id) => `/api/orders/${id}/booker`;
const now = async (id) => (await call(SALES, "GET", `/api/orders/${id}`)).body.order;

let cur = await now(confirmed.id);
const replacement = await person(`Người Thay ${tag}`);
r = await call(SALES, "PUT", B(cur.id), { customerName: `Người Thay ${tag}`, customerPhone: "0909 000 111", bookerPartyId: replacement.id, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.status, "confirmed");
assert.equal(r.body.order.bookerPartyId, replacement.id);
assert.equal(r.body.order.customerName, `Người Thay ${tag}`);
let changed = await sqlRows(`SELECT detail FROM audit_log WHERE order_id = '${cur.id}' AND action = 'booker_changed'`);
assert.equal(changed.length, 1, JSON.stringify(changed));
assert.match(changed[0].detail, /đổi hồ sơ khách “Khách Mới .+” → “Người Thay/);
assert.ok(!changed[0].detail.includes("0909"), "nhật ký không chứa SĐT");
console.log("✓ đổi khách của đơn đã xác nhận; nhật ký 'từ A sang B' bằng tên");

// mốc cũ → 409 stale; không đổi gì → 200 và không thêm nhật ký
r = await call(SALES, "PUT", B(cur.id), { customerName: "X", customerPhone: "0909000111", bookerPartyId: null, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "stale");
cur = await now(cur.id);
r = await call(SALES, "PUT", B(cur.id), { customerName: cur.customerName, customerPhone: cur.customerPhone, bookerPartyId: cur.bookerPartyId, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE order_id = '${cur.id}' AND action = 'booker_changed'`))[0].n, 1);
console.log("✓ khoá lạc quan; không đổi gì thì không ghi nhật ký");

// tạo hồ sơ mới ngay khi đổi khách (có vai CUSTOMER)
const phoneX = randomPhone();
r = await call(SALES, "PUT", B(cur.id), { customerName: `Khách Phút Cuối ${tag}`, customerPhone: phoneX, newBooker: { fullName: `Khách Phút Cuối ${tag}`, phone: phoneX }, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual((await call(SALES, "GET", `/api/parties/${r.body.order.bookerPartyId}`)).body.party.roleCodes, ["CUSTOMER"]);
console.log("✓ đổi khách kèm tạo hồ sơ mới");

// quyền: SALES khác (không lập, không phụ trách) và kế toán → 403; quản trị → được
cur = await now(cur.id);
const body = { customerName: cur.customerName, customerPhone: cur.customerPhone, bookerPartyId: null, expectedUpdatedAt: cur.updatedAt };
assert.equal((await call(OTHER, "PUT", B(cur.id), body)).status, 403);
assert.equal((await call(ACC, "PUT", B(cur.id), body)).status, 403);
r = await call(ADMIN, "PUT", B(cur.id), body);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.bookerPartyId, null);
console.log("✓ quyền đổi khách = quyền sửa chuyến");

// đơn đã huỷ → 409 not_editable; id lạ → 404; đầu vào sai → 400
r = await call(SALES, "POST", `/api/orders/${cur.id}/status`, { status: "cancelled" });
assert.equal(r.status, 200, JSON.stringify(r.body));
cur = r.body.order;
r = await call(SALES, "PUT", B(cur.id), { customerName: "Y", customerPhone: "0909000111", bookerPartyId: null, expectedUpdatedAt: cur.updatedAt });
assert.equal(r.status, 409);
assert.equal(r.body.error.code, "not_editable");
assert.equal((await call(SALES, "PUT", B("00000000-0000-0000-0000-000000000000"), body)).status, 404);
assert.equal((await call(ADMIN, "PUT", B(linked.id), { customerName: "", customerPhone: "0909000111", expectedUpdatedAt: "x" })).status, 400);
console.log("✓ đơn đã huỷ không đổi khách được; 404; 400");
console.log("E2E OK");
