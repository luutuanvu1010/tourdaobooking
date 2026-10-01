// ADR-0060 — dấu "đã nhập phần mềm kế toán" trên API thật (D1 local tạm): quyền từng vai (ghi: chỉ Kế toán, Toàn quyền; xem: Đối tác một mình không),
// tài khoản lai SALES + PARTNER (thấy, không ghi) và PARTNER + FIELD (theo ô FIELD — đơn tự lập qua ô PARTNER: không thấy), lọc danh sách "chưa nhập" /
// "đã nhập" kèm khoảng ngày, bỏ dấu có lý do → quay lại. Đơn dùng NGÀY ĐI riêng (hôm nay + 41) để bộ lọc không lẫn đơn của kịch bản khác.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const ADMIN = await session(ACCOUNTS.admin);
const SA = await session(ACCOUNTS.superAdmin);
const FIELD = await session(ACCOUNTS.field);
const NGAY = vnDate(41);

async function taiKhoanCookie(ten, perms) {
  const phone = randomPhone();
  const r = await call(SA, "POST", "/api/staff", { taoHoSoMoi: true, fullName: ten, phone, permissions: perms });
  assert.equal(r.status, 201, `${ten}: ${JSON.stringify(r.body)}`);
  return (await login(phone, r.body.pin)).cookie;
}
const PARTNER = await taiKhoanCookie("Đối Tác Nhập KT", ["PARTNER"]);
const SP = await taiKhoanCookie("Lai Bán Đối Tác KT", ["SALES", "PARTNER"]);
const PF = await taiKhoanCookie("Lai Đối Tác HDV KT", ["PARTNER", "FIELD"]);
const INTERN = await taiKhoanCookie("Thực Tập Nhập KT", ["INTERN"]);

async function donXacNhan(cookie) {
  const r = await call(cookie, "POST", "/api/orders", orderInput({ services: [catalogService({ departDate: NGAY })] }));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const c = await call(cookie, "POST", `/api/orders/${r.body.order.id}/status`, { status: "confirmed" });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  return r.body.order.id;
}
const dau = (cookie, id, body) => call(cookie, "POST", `/api/orders/${id}/nhap-ke-toan`, body);
const doc = (cookie, id) => call(cookie, "GET", `/api/orders/${id}/nhap-ke-toan`);
const loc = async (cookie, v) => {
  const r = await call(cookie, "GET", `/api/orders?nhapKeToan=${v}&tu=${NGAY}&den=${NGAY}&limit=100`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.orders.map((o) => o.id);
};

// ---- Đơn nháp: đánh dấu 409; ghi: Quản trị, Bán hàng, HDV, Đối tác, lai SALES+PARTNER → 403
const nhap = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ departDate: NGAY })] }));
assert.equal(nhap.status, 201);
assert.equal((await dau(ACC, nhap.body.order.id, { daNhap: true, truocDo: null })).status, 409, "đơn nháp: chưa đánh dấu được");
const don = await donXacNhan(SALES);
for (const [ten, c] of [["Quản trị", ADMIN], ["Bán hàng", SALES], ["HDV", FIELD], ["Đối tác", PARTNER], ["lai SALES+PARTNER", SP], ["Thực tập", INTERN]]) {
  assert.equal((await dau(c, don, { daNhap: true, soHoaDon: "HD-000123", truocDo: null })).status, 403, `${ten} ghi dấu phải 403`);
}
console.log("✓ đơn nháp 409; Quản trị, Bán hàng, HDV, Đối tác, lai SALES+PARTNER, Thực tập ghi dấu → 403");

// ---- Kế toán đánh dấu → lọc "chưa nhập" không còn đơn đó, "đã nhập" có; nhãn trên thẻ; chi tiết + lịch sử
assert.ok((await loc(ACC, "chua")).includes(don), "trước khi đánh dấu: đơn ở 'chưa nhập'");
const r1 = await dau(ACC, don, { daNhap: true, soHoaDon: "HD-000123", truocDo: null });
assert.equal(r1.status, 200, JSON.stringify(r1.body));
assert.ok(!(await loc(ACC, "chua")).includes(don), "đã đánh dấu: không còn ở 'chưa nhập'");
assert.ok((await loc(SALES, "da")).includes(don), "Bán hàng lọc 'đã nhập' thấy đơn");
const ds = await call(SALES, "GET", `/api/orders?tu=${NGAY}&den=${NGAY}&limit=100`);
assert.equal(ds.body.orders.find((o) => o.id === don).nhapKeToan, true, "nhãn trên thẻ");
const ct = await doc(SALES, don);
assert.equal(ct.status, 200);
assert.equal(ct.body.hienTai.soHoaDon, "HD-000123");
const ls = await call(ACC, "GET", `/api/orders/${don}`);
assert.ok(ls.body.history.some((e) => e.action === "order_accounting_entry_marked" && e.detail === "Đã nhập phần mềm kế toán · HD-000123"), "lịch sử đơn có dòng dấu");
console.log("✓ Kế toán đánh dấu (HD-000123): lọc 'chưa nhập' bỏ đơn, 'đã nhập' có; nhãn thẻ; chi tiết + lịch sử");

// ---- Lọc: thiếu khoảng ngày 400; HDV / Thực tập / Đối tác gửi tham số 403
assert.equal((await call(ACC, "GET", "/api/orders?nhapKeToan=chua")).status, 400);
for (const [ten, c] of [["HDV", FIELD], ["Thực tập", INTERN], ["Đối tác", PARTNER], ["lai PARTNER+FIELD", PF]]) {
  assert.equal((await call(c, "GET", `/api/orders?nhapKeToan=chua&tu=${NGAY}&den=${NGAY}`)).status, 403, ten);
}
console.log("✓ lọc thiếu khoảng ngày 400; HDV, Thực tập, Đối tác, lai PARTNER+FIELD gửi tham số lọc 403");

// ---- Đối tác một mình: đơn CỦA MÌNH đã đánh dấu → chi tiết dấu 403, thẻ vắng nhãn, lịch sử không có dòng; lai SALES+PARTNER thấy; PARTNER+FIELD không
const donDT = await donXacNhan(PARTNER);
const donSP = await donXacNhan(SP);
const donPF = await donXacNhan(PF);
for (const id of [donDT, donSP, donPF]) assert.equal((await dau(SA, id, { daNhap: true, soHoaDon: "HD-9", truocDo: null })).status, 200, "Toàn quyền đánh dấu");
assert.equal((await doc(PARTNER, donDT)).status, 403, "Đối tác một mình không xem dấu");
const dsDT = await call(PARTNER, "GET", "/api/orders?limit=100");
assert.ok(!("nhapKeToan" in dsDT.body.orders.find((o) => o.id === donDT)), "thẻ của Đối tác vắng khoá nhapKeToan");
const lsDT = await call(PARTNER, "GET", `/api/orders/${donDT}`);
assert.ok(!lsDT.body.history.some((e) => e.action.startsWith("order_accounting_entry_")), "lịch sử của Đối tác không có dòng dấu kế toán");
assert.ok(!JSON.stringify(lsDT.body).includes("HD-9"));
assert.equal((await doc(SP, donSP)).status, 200, "lai SALES+PARTNER thấy dấu (ô SALES any)");
assert.equal((await doc(PF, donPF)).status, 403, "lai PARTNER+FIELD: đơn tự lập qua ô PARTNER — không thấy dấu");
assert.equal((await doc(INTERN, don)).status, 403, "Thực tập: đơn người khác 403");
console.log("✓ Đối tác một mình không thấy (chi tiết 403, thẻ vắng nhãn, lịch sử không dòng); lai SALES+PARTNER thấy; lai PARTNER+FIELD không");

// ---- Bỏ dấu: thiếu lý do 400; có lý do → quay lại 'chưa nhập'; các lần trước chỉ cho Kế toán
const hien = (await doc(ACC, don)).body.hienTai.id;
assert.equal((await dau(ACC, don, { daNhap: false, truocDo: hien })).status, 400, "bỏ dấu thiếu lý do");
assert.equal((await dau(ACC, don, { daNhap: false, lyDo: "nhập nhầm", truocDo: hien })).status, 200);
assert.ok((await loc(ACC, "chua")).includes(don), "bỏ dấu → đơn quay lại 'chưa nhập'");
const sau = await doc(ACC, don);
assert.equal(sau.body.truocDo.length, 1, "Kế toán thấy lần đánh dấu trước");
assert.equal((await doc(SALES, don)).body.truocDo, null, "Bán hàng không thấy các lần trước");
assert.equal((await dau(ACC, don, { daNhap: true, truocDo: null })).status, 409, "truocDo cũ → 409 stale");
console.log("✓ bỏ dấu: thiếu lý do 400, có lý do → quay lại 'chưa nhập'; lần trước chỉ Kế toán xem; truocDo cũ 409");
