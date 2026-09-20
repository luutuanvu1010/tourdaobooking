// Địa điểm (module locations): đọc cho mọi tài khoản, ghi chỉ quản trị viên, khoá lạc quan, nhật ký.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session } from "./lib.mjs";

const SALES = await session(ACCOUNTS.salesA);
const ADMIN = await session(ACCOUNTS.admin);
const code = `TEST_${String(Date.now()).slice(-8)}`;

// --- đọc: phải đăng nhập; mọi tài khoản đọc được; 8 địa điểm gieo sẵn
assert.equal((await call(null, "GET", "/api/locations")).status, 401);
let r = await call(SALES, "GET", "/api/locations");
assert.equal(r.status, 200);
const seeded = r.body.locations.map((l) => l.code);
for (const c of ["VP_TRAN_PHU", "VP_2_THANG_4", "QUAY_VE_01", "QUAY_VE_04", "BEN_TAU_NHA_TRANG", "CANG_VINPEARL"]) assert.ok(seeded.includes(c), `thiếu địa điểm gieo ${c}`);
assert.ok(r.body.locations.length >= 8);
assert.deepEqual(r.body.types.map((t) => t.code), ["OFFICE", "TICKET_COUNTER", "PIER", "PORT"]);
const vin = r.body.locations.find((l) => l.code === "CANG_VINPEARL");
assert.equal(vin.locationTypeName, "Bến cảng"); assert.equal(vin.active, true); assert.match(vin.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
console.log("✓ đọc danh sách");

// --- ghi: chỉ quản trị viên
const input = { code, name: "  Quầy vé thử ", locationTypeCode: "TICKET_COUNTER", address: "12 Trần Phú", sortOrder: 90 };
assert.equal((await call(SALES, "POST", "/api/locations", input)).status, 403);
assert.equal((await call(null, "POST", "/api/locations", input)).status, 401);
r = await call(ADMIN, "POST", "/api/locations", input);
assert.equal(r.status, 201, JSON.stringify(r.body));
const created = r.body.location;
assert.equal(created.code, code); assert.equal(created.name, "Quầy vé thử"); assert.equal(created.address, "12 Trần Phú"); assert.equal(created.active, true);
assert.equal((await call(ADMIN, "POST", "/api/locations", input)).status, 409, "mã trùng");
for (const bad of [{ ...input, code: "abc" }, { ...input, name: " " }, { ...input, locationTypeCode: "KHONG_CO" }, { ...input, sortOrder: -1 }]) {
  r = await call(ADMIN, "POST", "/api/locations", { ...bad, code: bad.code === "abc" ? "abc" : `T_${String(Date.now()).slice(-6)}` });
  assert.equal(r.status, 400, JSON.stringify(bad));
}
console.log("✓ tạo: quyền, trùng mã, đầu vào sai");

// --- sửa với khoá lạc quan
const edit = { name: "Quầy vé thử (đã sửa)", locationTypeCode: "TICKET_COUNTER", address: null, sortOrder: 91, active: true, expectedUpdatedAt: created.updatedAt };
assert.equal((await call(SALES, "PUT", `/api/locations/${created.id}`, edit)).status, 403);
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, edit);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.location.name, "Quầy vé thử (đã sửa)"); assert.equal(r.body.location.address, null); assert.notEqual(r.body.location.updatedAt, created.updatedAt);
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, name: "Sửa từ tab cũ" }); // mốc cũ
assert.equal(r.status, 409); assert.equal(r.body.error.code, "stale");
assert.equal((await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, expectedUpdatedAt: undefined })).status, 400);
assert.equal((await call(ADMIN, "PUT", "/api/locations/khong-phai-uuid", edit)).status, 404);
assert.equal((await call(ADMIN, "PUT", "/api/locations/00000000-0000-0000-0000-000000000000", edit)).status, 404);
console.log("✓ sửa: khoá lạc quan, 404, 400");

// --- ngưng dùng: không xoá, vẫn liệt kê với active=false
r = await call(ADMIN, "PUT", `/api/locations/${created.id}`, { ...edit, active: false, expectedUpdatedAt: (await call(ADMIN, "GET", "/api/locations")).body.locations.find((l) => l.id === created.id).updatedAt });
assert.equal(r.status, 200); assert.equal(r.body.location.active, false);
assert.equal((await call(SALES, "GET", "/api/locations")).body.locations.find((l) => l.id === created.id).active, false);
console.log("✓ ngưng dùng thay cho xoá");

// --- nhật ký: có dòng theo loại đối tượng "location"; bên thua khoá lạc quan KHÔNG để lại dòng
r = await call(ADMIN, "GET", "/api/audit?action=location_updated&limit=50");
assert.equal(r.body.entries.filter((e) => e.targetId === created.id).length, 2, "đúng 2 lần sửa thành công (sửa tên, ngưng dùng)");
assert.ok(r.body.entries.every((e) => e.targetType === "location"));
r = await call(ADMIN, "GET", "/api/audit?action=location_created&limit=50");
assert.ok(r.body.entries.some((e) => e.targetId === created.id && e.detail.includes(code)));
console.log("✓ nhật ký");
console.log("E2E LOCATIONS OK");
