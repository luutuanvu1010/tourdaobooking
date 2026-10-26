// Bản đồ quyền ADR-0007 trên route thật: FIELD chỉ thấy đơn mình phụ trách + hàng chờ nhận (ADR-0030; không lập/sửa đơn, hồ sơ), ACCOUNTING xem nhưng không lập đơn,
// SALES chỉ nhật ký đơn của mình, ADMIN mọi thứ; quyền đổi có hiệu lực ngay; tài khoản nhiều quyền hợp các ô.
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, login, orderInput, randomPhone, session } from "./lib.mjs";

await ensureFakeCatalog(); // orderInput() dùng dịch vụ danh mục giả ZE1 (API không nhận dịch vụ nhập tay mới — 2026-09-26)

const SALES = await session(ACCOUNTS.salesA);
const SALES_B = await session(ACCOUNTS.salesB);
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin); // ADR-0071: chỉ Hành chính nhân sự / Toàn quyền tạo tài khoản (Quản trị không còn)
const ACC = await session(ACCOUNTS.accountant);
const FIELD = await session(ACCOUNTS.field);

// một đơn của salesA để thử xem/sửa
let r = await call(SALES, "POST", "/api/orders", orderInput());
assert.equal(r.status, 201, JSON.stringify(r.body));
const order = r.body.order;
// ADR-0135: đơn NHÁP chỉ người lập thấy → salesA xác nhận để đơn thành đơn chung (văn phòng, hàng chờ nhận, HDV mới nhìn thấy).
assert.equal((await call(SALES, "POST", `/api/orders/${order.id}/status`, { status: "confirmed" })).status, 200, "salesA xác nhận đơn thử");

// --- /me trả quyền và hồ sơ
for (const [cookie, perms] of [[SALES, ["SALES"]], [ADMIN, ["ADMIN"]], [ACC, ["ACCOUNTING"]], [FIELD, ["FIELD"]]]) {
  r = await call(cookie, "GET", "/api/auth/me");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.staff.permissions, perms);
  assert.ok(r.body.staff.partyId, "tài khoản seed phải có hồ sơ");
}
console.log("✓ /me trả quyền + hồ sơ");

// --- ADR-0136 (Task 3.3): ô order.confirm.review mở danh sách chờ cho Bán hàng, Quản trị, Kế toán, HDV, Toàn quyền; cài đặt cờ + công tắc (settings.ops) chỉ Toàn quyền.
for (const [cookie, nhan] of [[SALES, "Bán hàng"], [ADMIN, "Quản trị"], [ACC, "Kế toán"], [FIELD, "HDV"], [TAO_TK, "Toàn quyền"]]) {
  assert.equal((await call(cookie, "GET", "/api/orders/cho-xac-nhan")).status, 200, `${nhan}: danh sách chờ xác nhận`);
  assert.equal((await call(cookie, "GET", "/api/cai-dat/xac-nhan-don")).status, nhan === "Toàn quyền" ? 200 : 403, `${nhan}: cài đặt xác nhận đơn`);
}
assert.equal((await call(null, "GET", "/api/orders/cho-xac-nhan")).status, 401);
console.log("✓ ADR-0136: danh sách chờ xác nhận mở cho 5 vai; cài đặt cờ / công tắc chỉ Toàn quyền");

// --- ADR-0136 Đ13.6 (Task 3.4): ô order.submit — «Gửi đơn» chỉ Đối tác (đơn của mình) và Toàn quyền. Bán hàng gọi gui-don trên nháp CỦA MÌNH → 403; người không lập → 404; chưa đăng nhập → 401.
{
  const nhap = await call(SALES, "POST", "/api/orders", orderInput());
  assert.equal(nhap.status, 201, JSON.stringify(nhap.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${nhap.body.order.id}/gui-don`, {})).status, 403, "Bán hàng không có order.submit");
  assert.equal((await call(ACC, "POST", `/api/orders/${nhap.body.order.id}/gui-don`, {})).status, 404, "nháp của người khác: 404");
  assert.equal((await call(null, "POST", `/api/orders/${nhap.body.order.id}/gui-don`, {})).status, 401);
  console.log("✓ ADR-0136 Đ13.6: gui-don — Bán hàng 403 (ô order.submit), người khác 404, chưa đăng nhập 401");
}

// --- FIELD (hướng dẫn viên, ADR-0030 S23-1…5 — lượt 1): danh sách đơn 200 nhưng CHỈ đơn mình đang phụ trách; hàng chờ nhận 200 (phần hẹp); chi tiết
// đơn KHÔNG phụ trách → 404 (không dò được đơn người khác). Vẫn chặn (403) lập/sửa/huỷ đơn, danh mục, hồ sơ, quản trị (R-N1-15); đọc được địa điểm.
// Tài khoản field dùng chung cho mọi kịch bản (dispatch.mjs chạy trước đã giao cho nó nhiều đơn) ⇒ khẳng định ĐƠN CỦA salesA không có trong danh sách,
// không khẳng định danh sách rỗng.
r = await call(FIELD, "GET", "/api/orders?limit=100");
assert.equal(r.status, 200, `FIELD GET /api/orders → ${r.status} (ADR-0030 S23-4: 200, chỉ đơn mình phụ trách)`);
assert.ok(!r.body.orders.some((o) => o.id === order.id), "FIELD không thấy đơn của salesA (chưa ai phụ trách) trong danh sách đơn");
r = await call(FIELD, "GET", "/api/orders/pool");
assert.equal(r.status, 200, `FIELD GET /api/orders/pool → ${r.status}`);
assert.ok(r.body.orders.some((o) => o.orderId === order.id), "đơn của salesA chưa có người phụ trách → có trong hàng chờ nhận của FIELD (phần hẹp)");
r = await call(FIELD, "GET", `/api/orders/${order.id}`);
assert.equal(r.status, 404, `FIELD mở chi tiết đơn KHÔNG phụ trách → ${r.status} (ADR-0030 S23-4: 404, không phải 403)`);
assert.equal(r.body.error.code, "not_found");
const fieldDenied = [
  ["POST", "/api/orders", orderInput()], ["PUT", `/api/orders/${order.id}`, orderInput()],
  ["PUT", `/api/orders/${order.id}/trip`, {}], ["POST", `/api/orders/${order.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" }], ["GET", "/api/catalog"],
  ["GET", "/api/parties"], ["GET", "/api/parties/meta"], ["GET", "/api/parties/lookup?phone=0901234567"], ["POST", "/api/parties", { kind: "PERSON", fullName: "A" }],
  ["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}],
];
for (const [method, path, body] of fieldDenied) {
  r = await call(FIELD, method, path, body);
  assert.equal(r.status, 403, `FIELD ${method} ${path} → ${r.status}`);
}
assert.equal((await call(FIELD, "GET", "/api/locations")).status, 200);
assert.equal((await call(null, "GET", "/api/orders")).status, 401);
console.log("✓ FIELD: danh sách đơn 200 (không có đơn người khác), hàng chờ 200, chi tiết đơn không phụ trách 404; lập/sửa/huỷ đơn, danh mục, hồ sơ, quản trị vẫn 403");

// --- Trang chủ (dashboard) là số toàn công ty: cổng "orders" chỉ lọc thô, phải có can(order.view/money.view/contact.view) trong thân (ADR-0019 B4, 2026-09-26).
// Đối tác và Thực tập chỉ thấy đơn của mình ⇒ 403 (không phải 200 với số toàn công ty); Bán hàng vẫn 200.
for (const [perm, nhan] of [["PARTNER", "Đối tác"], ["INTERN", "Thực tập"]]) {
  const p = randomPhone();
  r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${nhan} Trang Chủ Thử`, phone: p, permissions: [perm] });
  assert.equal(r.status, 201, `${nhan}: ${JSON.stringify(r.body)}`);
  const cookie = (await login(p, r.body.pin)).cookie;
  r = await call(cookie, "GET", "/api/orders/dashboard");
  assert.equal(r.status, 403, `${nhan} GET /api/orders/dashboard → ${r.status} (phải 403: không xem được số toàn công ty)`);
  assert.equal(r.body.error.code, "forbidden");
}
assert.equal((await call(SALES, "GET", "/api/orders/dashboard")).status, 200, "Bán hàng vẫn xem Trang chủ");
console.log("✓ Đối tác, Thực tập: Trang chủ (dashboard) 403; Bán hàng 200");

// --- ACCOUNTING: xem đơn/nhật ký/bảng giá/hồ sơ; KHÔNG lập/sửa/huỷ đơn; không quản trị
assert.equal((await call(ACC, "GET", "/api/orders")).status, 200);
assert.equal((await call(ACC, "GET", "/api/catalog")).status, 200);
r = await call(ACC, "GET", `/api/orders/${order.id}`);
assert.equal(r.status, 200); assert.ok(r.body.history.length >= 1, "kế toán xem nhật ký mọi đơn (đối chiếu tiền)"); assert.equal(r.body.canModify, false);
assert.equal((await call(ACC, "POST", "/api/orders", orderInput())).status, 403, "kế toán không lập đơn");
assert.equal((await call(ACC, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
assert.equal((await call(ACC, "POST", `/api/orders/${order.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" })).status, 403);
assert.equal((await call(ACC, "POST", "/api/parties", { kind: "PERSON", fullName: "Khách Kế Toán Tạo" })).status, 201, "kế toán tạo hồ sơ khách");
for (const [method, path, body] of [["GET", "/api/staff"], ["GET", "/api/audit"], ["POST", "/api/locations", {}], ["GET", "/api/catalog/admin"]]) {
  assert.equal((await call(ACC, method, path, body)).status, 403, `ACCOUNTING ${method} ${path}`);
}
console.log("✓ ACCOUNTING xem, không lập/sửa đơn, không quản trị");

// --- SALES: nhật ký chỉ của mình; ADMIN xem và sửa mọi đơn
assert.equal((await call(SALES_B, "GET", `/api/orders/${order.id}`)).body.history.length, 0);
assert.ok((await call(SALES, "GET", `/api/orders/${order.id}`)).body.history.length >= 1);
r = await call(ADMIN, "GET", `/api/orders/${order.id}`);
assert.ok(r.body.history.length >= 1); assert.equal(r.body.canModify, true);
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}`, orderInput())).status, 403);
console.log("✓ SALES nhật ký của mình, ADMIN mọi đơn");

// --- người phụ trách (ADR-0009): quyền theo người phụ trách HIỆN TẠI của đơn — đủ sáu vai trên route thật (đơn của A, người phụ trách là B)
// Dò không phá dữ liệu: PUT /handler sang CHÍNH người đang phụ trách → người có quyền nhận 409 no_change, người không có quyền nhận 403.
const meA = (await call(SALES, "GET", "/api/auth/me")).body.staff;
const meB = (await call(SALES_B, "GET", "/api/auth/me")).body.staff;
const meAdmin = (await call(ADMIN, "GET", "/api/auth/me")).body.staff;
// Từ ADR-0030 S20-4 đơn mới không tự gắn người lập: người lập Nhận tường minh để đơn "đã có người phụ trách" (điều các dòng dưới cần).
assert.equal((await call(SALES, "PUT", `/api/orders/${order.id}/handler`, { staffId: meA.id })).status, 200, "người lập Nhận đơn của mình");
r = await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id });
assert.equal(r.status, 409, "B (SALES) chưa phải người phụ trách và đơn đã có người phụ trách → không tự nhận được: thua đua, 409 stale");
assert.equal(r.body.error.code, "stale");
assert.equal((await call(SALES, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 200, "người lập giao cho B");
const probe = async (cookie) => (await call(cookie, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status;
assert.deepEqual(
  [await probe(SALES_B), await probe(SALES), await probe(ADMIN), await probe(ACC), await probe(FIELD)],
  [409, 409, 409, 403, 403],
  "quyền đổi người phụ trách: người phụ trách hiện tại, người lập (đã giao lại), quản trị được; kế toán, FIELD không",
);
const seen = async (cookie) => {
  const d = (await call(cookie, "GET", `/api/orders/${order.id}`)).body;
  return [d.canModify, d.history.length > 0];
};
assert.deepEqual(
  [await seen(SALES_B), await seen(SALES), await seen(ADMIN), await seen(ACC)],
  [[true, true], [true, true], [true, true], [false, true]],
  "canModify + nhật ký: người phụ trách, người lập, quản trị đủ quyền; kế toán chỉ xem nhật ký",
);
assert.equal((await call(ACC, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 403);
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: (await call(ACC, "GET", "/api/auth/me")).body.staff.id })).status, 400, "không giao cho kế toán (không sửa được đơn)");
assert.equal((await call(SALES_B, "PUT", `/api/orders/${order.id}/handler`, { staffId: (await call(FIELD, "GET", "/api/auth/me")).body.staff.id })).status, 200, "FIELD nay giao được (ADR-0014 điều 6, cấp hẹp)");
console.log("✓ người phụ trách: đủ sáu vai (canModify, nhật ký, đổi người phụ trách) trên route thật");

// --- tài khoản nhiều quyền hợp các ô; quyền đổi có hiệu lực NGAY với phiên đang mở
const phone = randomPhone();
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Nhiều Quyền Thử", phone, permissions: ["FIELD", "ACCOUNTING"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["ACCOUNTING", "FIELD"], "thứ tự chuẩn hoá");
const M = { id: r.body.staff.id };
const MC = (await login(phone, r.body.pin)).cookie;
assert.equal((await call(MC, "GET", "/api/orders")).status, 200, "FIELD + ACCOUNTING = văn phòng");
assert.equal((await call(MC, "POST", "/api/orders", orderInput())).status, 403);
assert.equal((await call(TAO_TK, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["FIELD"] })).status, 200); // ADR-0083 1a: đường kiểu cũ chỉ Toàn quyền
// Bỏ ACCOUNTING → còn CHỈ FIELD: mất quyền xem mọi đơn NGAY (phiên đang mở). Từ ADR-0030 S23-4 tài khoản chỉ-FIELD nhận 200 với danh sách CHỈ đơn mình
// phụ trách (M chưa phụ trách đơn nào → RỖNG), và chi tiết đơn người khác → 404 — không còn 403. Khẳng định CẢ HAI vế.
r = await call(MC, "GET", "/api/orders?limit=100");
assert.equal(r.status, 200, `bỏ ACCOUNTING → chỉ-FIELD: ${r.status}`);
assert.deepEqual([r.body.orders, r.body.hasMore], [[], false], "bỏ ACCOUNTING → mất quyền xem đơn ngay: danh sách rỗng (chưa phụ trách đơn nào)");
r = await call(MC, "GET", `/api/orders/${order.id}`);
assert.equal(r.status, 404, `bỏ ACCOUNTING → mở đơn người khác 404 (không phải 200 như lúc còn ACCOUNTING): ${r.status}`);
assert.equal((await call(TAO_TK, "PUT", `/api/staff/${M.id}/permissions`, { permissions: ["SALES", "FIELD"] })).status, 200);
// Các lần đọc /api/catalog ở trên có thể là lần đồng bộ Sheet ĐẦU TIÊN của D1 này (khi catalog.mjs không chạy trước) — lần đó ẩn mã giả ZE*; bật lại.
await ensureFakeCatalog();
// Lập kèm CHÍNH MÌNH làm người phụ trách (ADR-0030 S20-4 — đơn mới không tự gắn người lập) để ca "người phụ trách đã nghỉ" ở dưới giữ đúng nghĩa.
r = await call(MC, "POST", "/api/orders", orderInput({ handlerStaffId: M.id }));
assert.equal(r.status, 201, `thêm SALES → lập đơn được ngay: ${JSON.stringify(r.body)}`);
const mOrder = r.body.order;
assert.equal((await call(MC, "POST", `/api/orders/${mOrder.id}/status`, { status: "confirmed" })).status, 200, "MC xác nhận đơn của mình (ADR-0135: nháp chỉ người lập thấy — quản trị mới giao lại được)");
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}/handler`, { staffId: M.id })).status, 409, "SALES không liên quan không tự nhận được đơn đã có người phụ trách (409 stale, không phải 403)");
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}/handler`, { staffId: meB.id })).status, 403, "còn GIAO HỘ người khác khi không phải người lập/người phụ trách thì vẫn là vượt quyền");
assert.equal((await call(MC, "PUT", `/api/orders/${order.id}`, orderInput({ expectedUpdatedAt: order.updatedAt }))).status, 403, "và không sửa được đơn đó");
assert.equal((await call(ADMIN, "PATCH", `/api/staff/${M.id}`, { active: false })).status, 200);
// người phụ trách đã nghỉ: quản trị giao lại đơn của họ (nếu không giao lại thì R-DSP-2b cảnh báo ở cuối e2e — chỉ cảnh báo, không làm đỏ --strict)
assert.equal((await call(ADMIN, "PUT", `/api/orders/${mOrder.id}/handler`, { staffId: meAdmin.id })).status, 200, "giao lại đơn của người đã nghỉ");
assert.deepEqual((await call(ADMIN, "GET", `/api/dispatch/handlers?orderIds=${mOrder.id}`)).body.handlers[mOrder.id].staffId, meAdmin.id);
console.log("✓ nhiều quyền + hiệu lực ngay");
// --- ADR-0067: GET /api/orders/nguoi-lap — danh sách người đã lập đơn cho ô "Người lập" của bộ lọc. 200 CHỈ cho người xem mọi đơn (Bán hàng, Kế toán,
// Quản trị, Toàn quyền, lai Bán hàng + HDV); HDV, Đối tác, Thực tập, lai HDV + Thực tập, Tài xế, Tài xế đối tác → 403. Gồm Đối tác và người đã nghỉ,
// không nhãn; mỗi người đúng ba khoá id/ten/ganNhat. D1 dùng chung cả lần chạy ⇒ khẳng định "có mặt", không so nguyên danh sách.
{
  await ensureFakeCatalog();
  const duoi = String(Date.now()).slice(-6);
  const taoTheoQuyen = async (permissions, ten) => {
    const x = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${ten} ${duoi}`, phone: randomPhone(), permissions });
    assert.equal(x.status, 201, JSON.stringify(x.body));
    return { id: x.body.staff.id, ten: `${ten} ${duoi}`, cookie: (await login(x.body.staff.phone, x.body.pin)).cookie };
  };
  const taoTheoVai = async (roles, ten) => {
    const x = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${ten} ${duoi}`, phone: randomPhone(), roles });
    assert.equal(x.status, 201, JSON.stringify(x.body));
    return { id: x.body.staff.id, cookie: (await login(x.body.staff.phone, x.body.pin)).cookie };
  };
  const doiTac = await taoTheoQuyen(["PARTNER"], "Đối Tác Người Lập");
  const nghi = await taoTheoQuyen(["SALES"], "Bán Hàng Sẽ Nghỉ");
  const thucTap = await taoTheoQuyen(["INTERN"], "Thực Tập Người Lập");
  const laiBanHdv = await taoTheoQuyen(["SALES", "FIELD"], "Lai Bán HDV");
  const laiHdvTt = await taoTheoQuyen(["FIELD", "INTERN"], "Lai HDV Thực Tập");
  const taiXe = await taoTheoVai(["DRIVER_INTERNAL"], "Tài Xế Người Lập");
  const taiXeDt = await taoTheoVai(["DRIVER_EXTERNAL"], "Tài Xế Đối Tác Người Lập");
  const donDt = await call(doiTac.cookie, "POST", "/api/orders", orderInput());
  assert.equal(donDt.status, 201, JSON.stringify(donDt.body));
  assert.equal((await call(doiTac.cookie, "POST", `/api/orders/${donDt.body.order.id}/status`, { status: "confirmed" })).status, 200, "Đối tác xác nhận đơn của mình (ADR-0135: nháp chỉ người lập thấy — Kế toán lọc mới thấy)");
  assert.equal((await call(nghi.cookie, "POST", "/api/orders", orderInput())).status, 201);
  assert.equal((await call(ADMIN, "PATCH", `/api/staff/${nghi.id}`, { active: false })).status, 200, "cho nghỉ việc SAU khi đã lập đơn");

  for (const [cookie, nhan] of [[SALES, "Bán hàng"], [ACC, "Kế toán"], [ADMIN, "Quản trị"], [await session(ACCOUNTS.superAdmin), "Toàn quyền"], [laiBanHdv.cookie, "lai Bán hàng + HDV"]]) {
    r = await call(cookie, "GET", "/api/orders/nguoi-lap");
    assert.equal(r.status, 200, `${nhan}: ${JSON.stringify(r.body)}`);
    assert.deepEqual(Object.keys(r.body), ["nguoiLap"]);
    for (const x of r.body.nguoiLap) assert.deepEqual(Object.keys(x).sort(), ["ganNhat", "id", "ten"], `${nhan}: ${JSON.stringify(x)}`);
    const theoId = new Map(r.body.nguoiLap.map((x) => [x.id, x.ten]));
    assert.equal(theoId.get(doiTac.id), doiTac.ten, `${nhan}: có Đối tác, không nhãn`);
    assert.equal(theoId.get(nghi.id), nghi.ten, `${nhan}: có người đã nghỉ, không đánh dấu`);
    assert.ok(!theoId.has(thucTap.id), `${nhan}: người chưa lập đơn không có mặt`);
  }
  for (const [cookie, nhan] of [[FIELD, "HDV"], [doiTac.cookie, "Đối tác"], [thucTap.cookie, "Thực tập"], [laiHdvTt.cookie, "lai HDV + Thực tập"], [taiXe.cookie, "Tài xế"], [taiXeDt.cookie, "Tài xế đối tác"]]) {
    r = await call(cookie, "GET", "/api/orders/nguoi-lap");
    assert.equal(r.status, 403, `${nhan}: ${r.status} ${JSON.stringify(r.body)}`);
  }
  assert.equal((await call(null, "GET", "/api/orders/nguoi-lap")).status, 401);
  // Lọc theo người vừa chọn: Kế toán lọc theo Đối tác → đúng đơn Đối tác lập; Đối tác lọc theo người khác → rỗng (bộ lọc không nới phạm vi).
  r = await call(ACC, "GET", `/api/orders?limit=100&nguoiLap=${doiTac.id}`);
  assert.deepEqual(r.body.orders.map((x) => x.id), [donDt.body.order.id]);
  r = await call(doiTac.cookie, "GET", `/api/orders?limit=100&nguoiLap=${nghi.id}`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.orders, [], "Đối tác lọc theo người khác → rỗng");
  console.log("✓ ADR-0067 người lập: 200 cho Bán hàng/Kế toán/Quản trị/Toàn quyền/lai Bán hàng+HDV (có Đối tác, người đã nghỉ; đúng 3 khoá); 403 HDV/Đối tác/Thực tập/lai HDV+Thực tập/Tài xế/Tài xế đối tác");
}
console.log("E2E PERMISSIONS OK");
