// Đơn NHÁP riêng tư (ADR-0135, chủ duyệt 19/10/2026; kế hoạch Đợt 2 Task 2.1 + 2.3) trên API thật + D1 local tạm.
// Bán hàng A lập nháp và chọn sẵn HDV (field); mọi người khác — Bán hàng B, Kế toán, Quản trị, Toàn quyền, chính HDV chọn sẵn — nhận 404 ở các đường đọc và ghi;
// số đếm theo người; hàng chờ nhận chỉ đơn đã xác nhận; Nhật ký của Toàn quyền vẫn thấy dòng của nháp (ngoại lệ có tên). Bài chi tiết từng hàng nằm ở
// src/modules/orders/nhap-rieng-tu.test.ts (khung thử SQLite); kịch bản này giữ lại các ca chạy thật qua wrangler dev + Worker.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, orderInput, session } from "./lib.mjs";

await ensureFakeCatalog();
const A = await session(ACCOUNTS.salesA);
const B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);
const SUPER = await session(ACCOUNTS.superAdmin);
const me = async (cookie) => (await call(cookie, "GET", "/api/auth/me")).body.staff;
const hdv = await me(FIELD);
const NGUOI_KHAC = { B, ACC, ADMIN, SUPER, FIELD };

// A lập nháp, chọn sẵn HDV.
const lap = await call(A, "POST", "/api/orders", { ...orderInput(), handlerStaffId: hdv.id });
assert.equal(lap.status, 201, JSON.stringify(lap.body));
const nhap = lap.body.order;
const hinh = (r) => `${r.status} ${JSON.stringify(r.body)}`;

// --- ĐỌC: người lập thấy, người khác 404
assert.equal((await call(A, "GET", `/api/orders/${nhap.id}`)).status, 200);
for (const [ten, c] of Object.entries(NGUOI_KHAC)) {
  for (const d of ["", "/passengers", "/thuong-mai", "/receipt", "/qr-thanh-toan", "/payments", "/nhap-ke-toan"]) {
    const r = await call(c, "GET", `/api/orders/${nhap.id}${d}`);
    assert.equal(r.status, 404, `${ten} GET ${d || "(chi tiết)"}: ${hinh(r)}`);
  }
  const ds = await call(c, "GET", `/api/orders?limit=100&q=${encodeURIComponent(nhap.orderCode)}`);
  assert.equal(ds.status, 200, hinh(ds));
  assert.ok(!ds.body.orders.some((o) => o.id === nhap.id), `${ten} thấy nháp của A trong danh sách`);
  const bal = await call(c, "POST", "/api/ledger/balances", { orderIds: [nhap.id] });
  if (bal.status === 200) assert.ok(!(nhap.id in bal.body.balances), `${ten} thấy số dư của nháp`);
}
// xe trên đơn: chỉ người có ô xem xe (văn phòng) — vẫn phải 404 với nháp của người khác
for (const [ten, c] of Object.entries({ ADMIN, SUPER, ACC })) {
  assert.equal((await call(c, "GET", `/api/van-chuyen/xe-cua-don/${nhap.id}`)).status, 404, `${ten} xe-cua-don`);
}

// --- Số đếm theo người; "Chưa phụ trách" không đếm nháp; hàng chờ nhận; "việc của tôi" của HDV chọn sẵn
const dem = async (c) => (await call(c, "GET", "/api/orders/dem-nhap")).body.draftCount;
assert.ok((await dem(A)) >= 1, "A phải đếm được nháp của mình");
const demSuper0 = await dem(SUPER);
assert.equal((await call(SUPER, "GET", "/api/orders/dashboard")).body.draftCount, demSuper0, "dem-nhap và dashboard cùng số");
const nhapKhongNguoi = (await call(A, "POST", "/api/orders", orderInput())).body.order;
const pool = await call(FIELD, "GET", "/api/orders/pool");
assert.equal(pool.status, 200, hinh(pool));
assert.ok(!pool.body.orders.some((o) => o.orderId === nhapKhongNguoi.id), "hàng chờ nhận không được có đơn nháp");
const mine = await call(FIELD, "GET", "/api/dispatch/mine");
assert.ok(!JSON.stringify(mine.body).includes(nhap.id), "'việc của tôi' của HDV chọn sẵn không có đơn nháp");
// Nhật ký của Toàn quyền vẫn thấy dòng của nháp
const nk = await call(SUPER, "GET", `/api/audit?q=${encodeURIComponent(nhap.orderCode)}&limit=50`);
assert.equal(nk.status, 200, hinh(nk));
assert.ok(JSON.stringify(nk.body).includes(nhap.orderCode), "Nhật ký của Toàn quyền phải còn dòng của đơn nháp");

// --- GHI: người khác 404 và đơn không đổi
const truoc = JSON.stringify((await call(A, "GET", `/api/orders/${nhap.id}`)).body.order);
const LEG = "99999999-9999-4999-8999-999999999991";
const GHI = [
  ["PUT", `/api/orders/${nhap.id}`, { ...orderInput(), expectedUpdatedAt: nhap.updatedAt }],
  ["PUT", `/api/orders/${nhap.id}/trip`, { expectedUpdatedAt: nhap.updatedAt, updates: [] }],
  ["POST", `/api/orders/${nhap.id}/legs`, {}],
  ["PUT", `/api/orders/${nhap.id}/legs/${LEG}`, {}],
  ["POST", `/api/orders/${nhap.id}/legs/${LEG}/close`, {}],
  ["POST", `/api/orders/${nhap.id}/legs/${LEG}/replace`, {}],
  ["POST", `/api/orders/${nhap.id}/legs/${LEG}/short-notice`, { lyDo: "KHAC" }],
  ["POST", `/api/orders/${nhap.id}/passengers`, {}],
  ["PUT", `/api/orders/${nhap.id}/booker`, { customerName: "Khách Mới", customerPhone: "0912345679" }],
  ["POST", `/api/orders/${nhap.id}/status`, { status: "confirmed" }],
  ["POST", `/api/orders/${nhap.id}/money-edit`, {}],
  ["PUT", `/api/orders/${nhap.id}/handler`, { staffId: hdv.id }],
];
for (const [ten, c] of Object.entries({ B, ADMIN, SUPER })) {
  for (const [m, p, body] of GHI) {
    const r = await call(c, m, p, body);
    assert.equal(r.status, 404, `${ten} ${m} ${p}: ${hinh(r)}`);
  }
}
// HDV chọn sẵn: route nào HDV không có ô thì cổng 403 đứng trước mọi đọc đơn (không lộ gì); route HDV có ô (giao / nhận người phụ trách) phải đúng 404.
for (const [m, p, body] of GHI) {
  const r = await call(FIELD, m, p, body);
  assert.ok(r.status === 404 || r.status === 403, `HDV chọn sẵn ${m} ${p}: ${hinh(r)}`);
  if (/\/handler$/.test(p)) assert.equal(r.status, 404, `HDV chọn sẵn ${m} ${p}: ${hinh(r)}`);
}
assert.equal(JSON.stringify((await call(A, "GET", `/api/orders/${nhap.id}`)).body.order), truoc, "đơn nháp đổi sau các lệnh bị từ chối");
// người lập vẫn ghi như cũ: money-edit nháp 409; tự Nhận nháp 409 order_not_confirmed
assert.equal((await call(A, "POST", `/api/orders/${nhap.id}/money-edit`, {})).status, 409);
const tuNhan = await call(A, "PUT", `/api/orders/${nhapKhongNguoi.id}/handler`, { staffId: (await me(A)).id });
assert.equal(tuNhan.status, 409, hinh(tuNhan));
assert.equal(tuNhan.body.error.code, "order_not_confirmed");

// --- Sau khi A xác nhận: HDV chọn sẵn thành người phụ trách thật, mở được đơn
const xn = await call(A, "POST", `/api/orders/${nhap.id}/status`, { status: "confirmed" });
assert.equal(xn.status, 200, hinh(xn));
assert.equal((await call(FIELD, "GET", `/api/orders/${nhap.id}`)).status, 200, "đã xác nhận: HDV phụ trách mở được đơn");
assert.equal((await call(SUPER, "GET", `/api/orders/${nhap.id}`)).status, 200);

console.log("nhap-rieng-tu: OK");
