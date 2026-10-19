// ADR-0134 (accepted 2026-10-19) — chọn Đón / Không đón theo dịch vụ, khung giờ đón trên chặng, chính sách khung giờ (kế hoạch 2026-10-19-xac-nhan-don
// Task 1.2) trên API THẬT + D1 local tạm. Bản khung thử (nhanh, trong npm test): src/modules/orders/chon-don-route.test.ts.
// D1 dùng chung với kịch bản khác: kịch bản đặt lại bộ khung mặc định ở cuối (chèn dòng mới — bảng chỉ thêm).
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sql, sqlRows } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const SUPER = await session(ACCOUNTS.superAdmin);
const FIELD = await session(ACCOUNTS.field);
const tag = Date.now().toString(36);
const OUT = (over = {}) => ({ direction: "OUT", pickupDate: "", pickupTime: "07:30", pickupLocationId: null, pickupPlace: `KS e2e chọn đón ${tag}`, dropoffLocationId: null, dropoffPlace: "", ...over });
const tao = (services) => call(SALES, "POST", "/api/orders", orderInput({ customerName: `Chọn đón ${tag}`, services }));
const xacNhan = (id) => call(SALES, "POST", `/api/orders/${id}/status`, { status: "confirmed" });
let r;

// 1) Lưu nháp không chọn đón → 201; xác nhận → 409 pickup_choice_required, câu đúng dịch vụ; đơn vẫn nháp.
r = await tao([catalogService({ legs: [], pickupChoice: null })]);
assert.equal(r.status, 201, JSON.stringify(r.body));
const nhap = r.body.order;
assert.equal(nhap.services[0].pickupChoice, null);
r = await xacNhan(nhap.id);
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "pickup_choice_required");
assert.equal(r.body.error.message, "Dịch vụ thứ 1 chưa chọn Đón hay Không đón.");
assert.equal((await sqlRows(`SELECT status FROM orders WHERE id = '${nhap.id}'`))[0].status, "draft");

// 2) Chọn Không đón (lưu nháp) → xác nhận 200.
r = await call(SALES, "PUT", `/api/orders/${nhap.id}`, orderInput({
  customerName: `Chọn đón ${tag}`, expectedUpdatedAt: nhap.updatedAt, services: [catalogService({ id: nhap.services[0].id, legs: [], pickupChoice: "KHONG_DON" })],
}));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.services[0].pickupChoice, "KHONG_DON");
r = await xacNhan(nhap.id);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.order.status, "confirmed");

// 3) Chặng có khung: pickupTime 07:30 + pickupSlotEnd 08:00 → đọc lại đúng; cuối khung trước giờ đón → 400.
r = await tao([catalogService({ pickupChoice: "DON", legs: [OUT({ pickupSlotEnd: "08:00" })] })]);
assert.equal(r.status, 201, JSON.stringify(r.body));
const coKhung = r.body.order;
r = await call(SALES, "GET", `/api/orders/${coKhung.id}`);
assert.equal(r.body.order.services[0].legs[0].pickupTime, "07:30");
assert.equal(r.body.order.services[0].legs[0].pickupSlotEnd, "08:00");
r = await tao([catalogService({ pickupChoice: "DON", legs: [OUT({ pickupSlotEnd: "07:00" })] })]);
assert.equal(r.status, 400, JSON.stringify(r.body));
assert.match(r.body.error.message, /cuối khung/);

// 4) Chính sách khung giờ: Bán hàng đọc được; chỉ-HDV 403; Bán hàng ghi 403; Toàn quyền ghi 200 rồi GET thấy khung mới; đặt lại mặc định.
r = await call(SALES, "GET", "/api/cai-dat/khung-gio-don");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.doiDuoc, false);
assert.ok(r.body.khung.length >= 1);
assert.equal((await call(FIELD, "GET", "/api/cai-dat/khung-gio-don")).status, 403);
const moi = { khung: [{ tu: "06:00", den: "06:30" }, { tu: "06:30", den: "07:00" }], luuY: `Giờ có thể đổi ${tag}.` };
assert.equal((await call(SALES, "POST", "/api/cai-dat/khung-gio-don", moi)).status, 403);
r = await call(SUPER, "POST", "/api/cai-dat/khung-gio-don", moi);
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "GET", "/api/cai-dat/khung-gio-don");
assert.deepEqual(r.body, { khung: moi.khung, luuY: moi.luuY, doiDuoc: false });
r = await call(SUPER, "POST", "/api/cai-dat/khung-gio-don", {
  khung: [{ tu: "07:30", den: "08:00" }, { tu: "08:00", den: "08:30" }, { tu: "08:30", den: "09:00" }, { tu: "09:00", den: "09:30" }, { tu: "09:30", den: "10:00" }],
  luuY: "Giờ đón thực tế có thể điều chỉnh cho phù hợp tình hình hoạt động.",
});
assert.equal(r.status, 200, JSON.stringify(r.body));

// 5) Review Focus 6: đơn đã xác nhận từ trước (pickup_choice NULL — đơn cũ) → huỷ được 200.
r = await tao([catalogService({ pickupChoice: "DON", legs: [OUT()] })]);
const cu = r.body.order;
assert.equal((await xacNhan(cu.id)).status, 200);
await sql(`UPDATE order_service SET pickup_choice = NULL WHERE order_id = '${cu.id}'`);
r = await call(SALES, "POST", `/api/orders/${cu.id}/status`, { status: "cancelled", lyDo: "KHACH_DOI_Y" });
assert.equal(r.status, 200, JSON.stringify(r.body));

console.log("chon-don: OK");
