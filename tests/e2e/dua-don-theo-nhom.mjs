// Bật/tắt đưa đón theo nhóm dịch vụ + điểm «Chọn nhanh» (ADR-0118, Đợt 2 lượt 1; kế hoạch Task 6) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) địa điểm: `quickPickOrder` có ở mọi DTO (hai điểm gieo = 1, 2); Quản trị đặt 1–99 / null; sai → 400; khoá vắng = giữ; Bán hàng 403;
//   (2) nhóm: PATCH `transferEnabled` (boolean; sai kiểu 400; Bán hàng 403); `GET /api/catalog/for-order` mang `transferEnabled` của dịch vụ;
//   (3) nhóm TẮT: lập đơn có chặng → 409 `transfer_disabled` (nêu tên dịch vụ + nhóm); không chặng → 201; đơn nháp đã có chặng thì XÁC NHẬN → 409 và vẫn nháp;
//       bỏ chặng (lưu nháp `legs: []`) rồi xác nhận → 200; đơn đã xác nhận: thêm chặng → 409, ĐÓNG chặng vẫn 200;
//   (4) bật lại nhóm → lập đơn có chặng 201.
// Dùng danh mục GIẢ `ZE1` (`ensureFakeCatalog`, không cần Sheet) gán vào nhóm HTA (Hòn Tằm, migration 0055) rồi trả về Chưa phân loại ở cuối.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, session, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const D = vnDate(7);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (migration 0010)
const OUT = { direction: "OUT", pickupDate: "", pickupTime: "06:30", pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm E2E", dropoffLocationId: LOC, dropoffPlace: "" };
const RET = { direction: "RETURN", pickupDate: vnDate(8), pickupTime: "16:00", pickupLocationId: LOC, pickupPlace: "", dropoffLocationId: null, dropoffPlace: "Khách sạn Dò Tìm E2E" };
const svc = (extra = {}) => catalogService({ pax: { adult: 2 }, departDate: D, ...extra });
// Đọc bằng NGƯỜI LẬP: từ ADR-0135 (bản 2.36) đơn nháp chỉ người lập đọc được — Quản trị nhận 404 (dựng lại trên main 28/10).
const lay = async (id) => (await call(SALES, "GET", `/api/orders/${id}`)).body.order;
const nhomHTA = async () => (await call(ADMIN, "GET", "/api/catalog/groups")).body.groups.find((g) => g.code === "HTA");
const datNhom = async (transferEnabled) => {
  const g = await nhomHTA();
  const r = await call(ADMIN, "PATCH", "/api/catalog/groups/HTA", { expectedUpdatedAt: g.updatedAt, transferEnabled });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.group.transferEnabled, transferEnabled);
};
const biTuChoi = (r) => {
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "transfer_disabled");
  assert.match(r.body.error.message, /Dịch vụ thử/);
  assert.match(r.body.error.message, /Hòn Tằm/);
};

// Mọi khẳng định nằm trong try; khối finally dọn LUÔN (kể cả khi một khẳng định ném lỗi giữa chừng) — kẻo ZE1 kẹt trong nhóm đã tắt đưa đón làm các kịch bản sau
// (dua-don-dau-cuoi, dieu-phoi, chuyen-khach…) lập đơn có chặng bị 409 `transfer_disabled` và cả lượt chạy khó đọc.
try {
// ---- (1) địa điểm: chọn nhanh
let r = await call(SALES, "GET", "/api/locations");
assert.equal(r.status, 200);
const co = r.body.locations.filter((l) => l.quickPickOrder !== null).map((l) => [l.code, l.quickPickOrder]).sort((a, b) => a[1] - b[1]);
assert.deepEqual(co, [["CANG_VINPEARL", 1], ["BEN_TAU_NHA_TRANG", 2]], "hai điểm gieo của migration 0121");
const q = r.body.locations.find((l) => l.code === "QUAY_VE_02");
const thanDiem = (l, them = {}) => ({ name: l.name, locationTypeCode: l.locationTypeCode, address: l.address, sortOrder: l.sortOrder, active: l.active, expectedUpdatedAt: l.updatedAt, ...them });
assert.equal((await call(SALES, "PUT", `/api/locations/${q.id}`, thanDiem(q, { quickPickOrder: 7 }))).status, 403);
for (const sai of [0, 100, 1.5, "3", true]) assert.equal((await call(ADMIN, "PUT", `/api/locations/${q.id}`, thanDiem(q, { quickPickOrder: sai }))).status, 400, JSON.stringify(sai));
r = await call(ADMIN, "PUT", `/api/locations/${q.id}`, thanDiem(q, { quickPickOrder: 7 }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.location.quickPickOrder, 7);
r = await call(ADMIN, "PUT", `/api/locations/${q.id}`, thanDiem(r.body.location, { name: "Quầy vé 02 (e2e)" })); // khoá vắng = giữ
assert.equal(r.body.location.quickPickOrder, 7, "khoá vắng giữ nguyên số");
r = await call(ADMIN, "PUT", `/api/locations/${q.id}`, thanDiem(r.body.location, { name: q.name, quickPickOrder: null })); // trả lại như cũ
assert.equal(r.body.location.quickPickOrder, null);
console.log("✓ (1) địa điểm: quickPickOrder đọc / ghi / sai đầu vào / giữ khi vắng khoá / 403");

// ---- (2) nhóm: cờ «Có đưa đón»
const hta = await nhomHTA();
assert.equal(hta.transferEnabled, true, "mặc định BẬT");
assert.equal((await call(SALES, "PATCH", "/api/catalog/groups/HTA", { expectedUpdatedAt: hta.updatedAt, transferEnabled: false })).status, 403);
assert.equal((await call(ADMIN, "PATCH", "/api/catalog/groups/HTA", { expectedUpdatedAt: hta.updatedAt, transferEnabled: "không" })).status, 400);
r = await call(ADMIN, "PUT", "/api/catalog/group-assignments", { codes: ["ZE1"], groupCode: "HTA" });
assert.equal(r.status, 200, JSON.stringify(r.body));
let form = (await call(SALES, "GET", "/api/catalog/for-order")).body.items.find((i) => i.code === "ZE1");
assert.equal(form.transferEnabled, true);
await datNhom(false);
form = (await call(SALES, "GET", "/api/catalog/for-order")).body.items.find((i) => i.code === "ZE1");
assert.equal(form.transferEnabled, false, "form thấy nhóm tắt");
console.log("✓ (2) nhóm: PATCH transferEnabled, 403, 400, for-order mang cờ");

// ---- (3) nhóm TẮT
biTuChoi(await call(SALES, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT] })] })));
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc({ legs: [] })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
let d = r.body.order;
assert.equal(d.services[0].legs.length, 0);
console.log("✓ (3) nhóm tắt: lập đơn có chặng 409, không chặng 201");

// đơn nháp đã có chặng từ lúc nhóm còn bật → xác nhận bị chặn; bỏ chặng rồi xác nhận được
await datNhom(true);
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT] })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
const nhap = r.body.order;
await datNhom(false);
biTuChoi(await call(SALES, "POST", `/api/orders/${nhap.id}/status`, { status: "confirmed" }));
assert.equal((await lay(nhap.id)).status, "draft", "vẫn nháp");
r = await call(SALES, "PUT", `/api/orders/${nhap.id}`, orderInput({ expectedUpdatedAt: nhap.updatedAt, services: [svc({ id: nhap.services[0].id, legs: [] })] }));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await call(SALES, "POST", `/api/orders/${nhap.id}/status`, { status: "confirmed" })).status, 200);
console.log("✓ (3) xác nhận đơn nháp còn chặng bị chặn; bỏ chặng rồi xác nhận được");

// đơn ĐÃ xác nhận có chặng cũ: thêm chặng bị chặn, ĐÓNG chặng vẫn được
await datNhom(true);
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT] })] }));
const dh = r.body.order;
assert.equal((await call(SALES, "POST", `/api/orders/${dh.id}/status`, { status: "confirmed" })).status, 200);
await datNhom(false);
let c = await lay(dh.id);
biTuChoi(await call(SALES, "POST", `/api/orders/${c.id}/legs`, { expectedUpdatedAt: c.updatedAt, serviceId: c.services[0].id, leg: RET }));
c = await lay(dh.id);
const leg = c.services[0].legs[0];
r = await call(SALES, "POST", `/api/orders/${c.id}/legs/${leg.id}/close`, { expectedUpdatedAt: leg.updatedAt, reasonCode: "WRONG_ENTRY" });
assert.equal(r.status, 200, JSON.stringify(r.body));
console.log("✓ (3) đơn đã xác nhận: thêm chặng 409, đóng chặng 200");

// ---- (4) bật lại
await datNhom(true);
r = await call(SALES, "POST", "/api/orders", orderInput({ services: [svc({ legs: [OUT, RET] })] }));
assert.equal(r.status, 201, JSON.stringify(r.body));
console.log("✓ (4) bật lại nhóm: lập đơn có chặng 201");

const [{ n }] = await sqlRows("SELECT count(*) AS n FROM audit_log WHERE action = 'catalog_group_updated' AND detail LIKE '%đưa đón%'");
assert.ok(n >= 4, `nhật ký nhóm ghi đoạn «đưa đón: …» (thấy ${n})`);
console.log("✓ nhật ký catalog_group_updated ghi «đưa đón: bật → tắt»");
} finally {
  // nhóm HTA bật lại (lấy mốc sửa MỚI), ZE1 về Chưa phân loại, điểm chọn nhanh thử về trống
  const g = await nhomHTA();
  if (g && g.transferEnabled !== true) await call(ADMIN, "PATCH", "/api/catalog/groups/HTA", { expectedUpdatedAt: g.updatedAt, transferEnabled: true });
  await call(ADMIN, "PUT", "/api/catalog/group-assignments", { codes: ["ZE1"], groupCode: null });
  const ls = (await call(ADMIN, "GET", "/api/locations")).body?.locations ?? [];
  const q2 = ls.find((l) => l.code === "QUAY_VE_02");
  if (q2 && q2.quickPickOrder !== null) {
    await call(ADMIN, "PUT", `/api/locations/${q2.id}`, { name: q2.name, locationTypeCode: q2.locationTypeCode, address: q2.address, sortOrder: q2.sortOrder, active: q2.active, quickPickOrder: null, expectedUpdatedAt: q2.updatedAt });
  }
}
