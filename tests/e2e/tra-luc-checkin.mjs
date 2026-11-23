// «TRẢ LÚC CHECK-IN» trên API THẬT (wrangler dev, D1 local tạm; ADR-0230 Đ2):
//  1) Văn phòng lập đơn «Trả lúc check-in» (Thanh toán ngay) → DTO mang cờ → xác nhận → giao hướng dẫn viên phụ trách.
//  2) Hướng dẫn viên ghi thu chuyển khoản ⇒ 409 (chỉ tiền mặt); ghi thu tiền mặt ⇒ 201; QR công ty của đơn tắt; «Việc của tôi» mang cờ nhắc thu.
//  3) Đối tác có hạn mức Trả sau dùng được gửi «Trả lúc check-in» ⇒ 409 (luật Việc 2 — ADR-0224 — từ chối như mọi đơn Thanh toán ngay).
// Tài khoản đối tác dùng một lần. Tên, SĐT khách là GIẢ. KHÔNG đổi công ty chủ, không đổi công tắc «Khách của đối tác trả cho Công ty».
import assert from "node:assert/strict";
import { ACCOUNTS, call, ensureFakeCatalog, login, orderInput, randomPhone, session, sqlRows } from "./lib.mjs";

await ensureFakeCatalog();
const tag = Date.now().toString(36);
const SALES = await session(ACCOUNTS.salesA);
const HDV = await session(ACCOUNTS.field);
const SA = await session(ACCOUNTS.superAdmin);
const hdvId = (await call(HDV, "GET", "/api/auth/me")).body.staff.id;

// ---- 1) văn phòng lập, xác nhận, giao HDV
let r = await call(SALES, "POST", "/api/orders", orderInput({ customerName: `Khách Check-in ${tag}`, customerPhone: "0913571361", paymentTerm: "PREPAID", traLucCheckin: true }));
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual([r.body.order.paymentTerm, r.body.order.traLucCheckin], ["PREPAID", true]);
const id = r.body.order.id;
assert.equal((await sqlRows(`SELECT count(*) AS n FROM ord_checkin_payment WHERE order_id = '${id}' AND enabled = 1`))[0].n, 1);
r = await call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "PUT", `/api/orders/${id}/handler`, { staffId: hdvId });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ 1) Văn phòng lập «Trả lúc check-in», xác nhận, giao hướng dẫn viên");

// ---- 2) HDV ghi thu
r = await call(HDV, "POST", `/api/orders/${id}/payments`, { soTien: 100000, hinhThuc: "BANK_TRANSFER", nguoiThu: "toi" });
assert.deepEqual([r.status, r.body?.error?.code], [409, "tra_luc_checkin_chi_tien_mat"], JSON.stringify(r.body));
assert.equal((await sqlRows(`SELECT count(*) AS n FROM bil_payment_receipt WHERE order_id = '${id}'`))[0].n, 0, "không khoản nào lọt");
r = await call(HDV, "POST", `/api/orders/${id}/payments`, { soTien: 100000, hinhThuc: "CASH", nguoiThu: "toi" });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(SALES, "GET", `/api/orders/${id}/qr-thanh-toan`);
assert.deepEqual([r.status, r.body], [200, { coQr: false }], JSON.stringify(r.body));
r = await call(HDV, "GET", "/api/dispatch/mine");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.assignments.find((a) => a.orderId === id)?.traLucCheckin, true, "«Việc của tôi» mang cờ nhắc thu");
console.log("✓ 2) HDV: chuyển khoản ⇒ 409; tiền mặt ⇒ 201; không QR; «Việc của tôi» có cờ");

// ---- 3) đối tác có hạn mức
const tk = await call(SA, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Đại Lý Check-in ${tag}`, phone: randomPhone(), roles: ["TRAVEL_AGENCY"] });
assert.equal(tk.status, 201, JSON.stringify(tk.body));
r = await call(SA, "POST", "/api/tra-sau/han-muc", { partyId: tk.body.staff.partyId, hanMuc: 50_000_000, gioTra: 168, gioAnHan: 0, lyDo: "thử Trả lúc check-in" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const DT = (await login(tk.body.staff.phone, tk.body.pin)).cookie;
r = await call(DT, "POST", "/api/orders", orderInput({ customerName: `Khách Check-in ĐT ${tag}`, customerPhone: "0913571362", paymentTerm: "PREPAID", traLucCheckin: true }));
assert.deepEqual([r.status, r.body?.error?.code], [409, "tra_sau_bat_buoc_doi_tac"], JSON.stringify(r.body));
console.log("✓ 3) Đối tác có Trả sau dùng được gửi «Trả lúc check-in» ⇒ 409");
console.log("E2E TRA LUC CHECK-IN OK");
