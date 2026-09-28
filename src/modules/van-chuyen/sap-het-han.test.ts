// Danh mục loại giấy tờ xe, ngưỡng "sắp hết hạn" có ngày hiệu lực, danh sách giấy tờ sắp hết hạn gộp xe + tài xế (ADR-0040 D1; kế hoạch Task A15; Ruling R15
// điểm 2: có `count` cho huy hiệu menu). Chạy CẢ ứng dụng trên SQLite thật. Tài xế tạo bằng ĐƯỜNG THẬT POST /api/staff roles ["DRIVER_INTERNAL"]. Số là số GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const ngay = (n: number) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const AT = "2026-09-01T00:00:00.000Z";
let n = 0;
const doiMiliGiay = () => new Promise((r) => setTimeout(r, 5));
const uuid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;

async function taoTaiKhoan(w: any, fullName: string, phone: string, roles: string[]): Promise<string> {
  const r = await w.call("POST", "/api/staff", { as: ADM, body: { fullName, phone, roles } });
  assert.equal(r.status, 201, r.text);
  return w.q("SELECT party_id FROM staff WHERE id = ?", r.json.staff.id)[0].party_id;
}
function giayToNguoi(w: any, party: string, type: string, so: string | null, cls: string | null, het: string) {
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(uuid(), party, type, so, so, cls, het, AT, AT);
}
function giayToXe(w: any, xe: string, type: string, so: string, het: string) {
  w.sqlite.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, document_number, expiry_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(uuid(), xe, type, so, het, AT, AT);
}
async function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const x = (await w.call("POST", "/api/van-chuyen/xe", { as: ADM, body: { plateNumber: "79B-012.34", chassisNumber: "KHUNGX00001", name: "Ford Transit", passengerCapacity: 15 } })).json.vehicle.id;
  const y = (await w.call("POST", "/api/van-chuyen/xe", { as: ADM, body: { plateNumber: "51F-111.11", chassisNumber: "KHUNGY00001", name: "Hyundai Solati", passengerCapacity: 15 } })).json.vehicle;
  giayToXe(w, x, "INSPECTION", "KD-DANHDAU-1", ngay(5));
  giayToXe(w, y.id, "TPL_INSURANCE", "BH-DANHDAU-2", ngay(3));
  const ngung = await w.call("PUT", `/api/van-chuyen/xe/${y.id}`, { as: ADM, body: { plateNumber: "51F-111.11", chassisNumber: "KHUNGY00001", name: "Hyundai Solati", modelYear: null, passengerCapacity: 15, status: "retired", expectedUpdatedAt: y.updatedAt } });
  assert.equal(ngung.status, 200, ngung.text);
  const taiXe = await taoTaiKhoan(w, "Tài Xế Hùng", "0900000099", ["DRIVER_INTERNAL"]);
  giayToNguoi(w, taiXe, "GPLX", "790000000077", "D2", ngay(-2));
  giayToNguoi(w, taiXe, "CCCD", "079000000077", null, ngay(10));
  const hdv = await taoTaiKhoan(w, "Hướng Dẫn Lan", "0900000098", ["GUIDE_INTERNAL"]);
  giayToNguoi(w, hdv, "CCCD", "079000000078", null, ngay(5));
  return { w, x, y: y.id, taiXe, hdv };
}
const SO_DANH_DAU = ["KD-DANHDAU-1", "BH-DANHDAU-2", "790000000077", "079000000077", "079000000078"];

test("route 23: Bán hàng → 403; Quản trị → 200, ngưỡng 30, ĐÚNG ba dòng theo hạn (GPLX tài xế đã hết −2, Kiểm định xe X sau 5, CCCD tài xế sau 10), có count; không xe đã ngừng, không HDV, không số", async () => {
  const { w, x, taiXe } = await setup();
  const s = await w.call("GET", "/api/van-chuyen/sap-het-han", { as: SALES });
  assert.equal(s.status, 403, s.text);
  assert.match(s.json.error.message, /không quản lý được xe/);
  const r = await w.call("GET", "/api/van-chuyen/sap-het-han", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.warnDays, 30);
  assert.equal(r.json.count, 3, "R15 điểm 2: số đếm cho huy hiệu menu");
  assert.deepEqual(r.json.items, [
    { kind: "person", targetId: taiXe, label: "Tài Xế Hùng", typeName: "Giấy phép lái xe", className: "Hạng D2", expiryDate: ngay(-2), daysLeft: -2, level: "expired" },
    { kind: "vehicle", targetId: x, label: "79B-012.34 · Ford Transit", typeName: "Kiểm định", className: null, expiryDate: ngay(5), daysLeft: 5, level: "soon" },
    { kind: "person", targetId: taiXe, label: "Tài Xế Hùng", typeName: "Căn cước công dân (CCCD)", className: null, expiryDate: ngay(10), daysLeft: 10, level: "soon" },
  ]);
  for (const so of SO_DANH_DAU) assert.ok(!r.text.includes(so), `không lộ số ${so}`);
});

test("route 22 ngưỡng: Quản trị → 403 (settings.ops chỉ Toàn quyền); Toàn quyền đổi 7 → dòng chính sách MỚI (dòng cũ nguyên), danh sách còn hai dòng; nhật ký '30 → 7 ngày'; 0 / 366 / '7' → 400", async () => {
  const { w } = await setup();
  const a = await w.call("POST", "/api/van-chuyen/nguong-het-han", { as: ADM, body: { warnDays: 7 } });
  assert.equal(a.status, 403, a.text);
  assert.equal(a.json.error.code, "forbidden");
  assert.doesNotMatch(a.json.error.message, /Chỉ quản trị viên được thực hiện thao tác này/, "403 của ô settings.ops trong thân, không phải của cổng admin");
  const cu = w.q("SELECT * FROM vc_expiry_policy");
  for (const bad of [0, 366, "7", null]) assert.equal((await w.call("POST", "/api/van-chuyen/nguong-het-han", { as: SUP, body: { warnDays: bad } })).status, 400, String(bad));
  const r = await w.call("POST", "/api/van-chuyen/nguong-het-han", { as: SUP, body: { warnDays: 7 } });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.warnDays, 7);
  const sau = w.q("SELECT * FROM vc_expiry_policy ORDER BY valid_from_at");
  assert.equal(sau.length, 2);
  assert.deepEqual({ ...sau[0] }, { ...cu[0] }, "dòng cũ nguyên vẹn (chỉ thêm)");
  assert.equal(sau[1].created_by, SUP);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'expiry_policy_changed' ORDER BY rowid DESC LIMIT 1")[0].detail, "mốc nhắc giấy tờ sắp hết hạn: 30 → 7 ngày");
  const l = await w.call("GET", "/api/van-chuyen/sap-het-han", { as: ADM });
  assert.deepEqual(l.json.items.map((i: any) => i.typeName), ["Giấy phép lái xe", "Kiểm định"]);
  assert.deepEqual([l.json.warnDays, l.json.count], [7, 2]);
});

test("route 19: Quản trị → 200, 6 loại giấy tờ xe + ngưỡng; Bán hàng → 403", async () => {
  const { w } = await setup();
  const r = await w.call("GET", "/api/van-chuyen/meta", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.documentTypes.map((t: any) => t.code), ["REGISTRATION", "INSPECTION", "TPL_INSURANCE", "CONTRACT_BADGE", "TRIP_MONITOR", "DRIVER_CAMERA"]);
  assert.deepEqual(r.json.documentTypes[0], { code: "REGISTRATION", name: "Đăng ký xe", hasExpiry: false, sortOrder: 1, active: true, updatedAt: "2026-09-28T00:00:00.000Z" });
  assert.equal(r.json.warnDays, 30);
  assert.equal((await w.call("GET", "/api/van-chuyen/meta", { as: SALES })).status, 403);
});

test("route 20, 21 loại giấy tờ xe: Quản trị thêm SO_BAO_DUONG → 201; trùng → 409 code_taken; sửa có mốc → 200, mốc cũ → 409 stale; Bán hàng → 403 ở cổng quản trị; nhật ký 'loại giấy tờ xe: <mã> — <tên>'", async () => {
  const { w } = await setup();
  let r = await w.call("POST", "/api/van-chuyen/loai-giay-to-xe", { as: ADM, body: { code: "SO_BAO_DUONG", name: "Sổ bảo dưỡng", hasExpiry: false, sortOrder: 7 } });
  assert.equal(r.status, 201, r.text);
  assert.ok(r.json.documentTypes.some((t: any) => t.code === "SO_BAO_DUONG" && !t.hasExpiry && t.active));
  assert.equal((await w.call("POST", "/api/van-chuyen/loai-giay-to-xe", { as: ADM, body: { code: "SO_BAO_DUONG", name: "Trùng" } })).json.error.code, "code_taken");
  const moc = w.q("SELECT updated_at FROM vc_vehicle_document_type WHERE code = 'SO_BAO_DUONG'")[0].updated_at;
  await doiMiliGiay(); // khoá lạc quan so mốc updated_at theo mili-giây: lần sửa đầu phải mang mốc KHÁC mốc tạo, không thì "mốc cũ" dưới trùng mốc mới
  r = await w.call("PUT", "/api/van-chuyen/loai-giay-to-xe/SO_BAO_DUONG", { as: ADM, body: { name: "Sổ bảo dưỡng xe", hasExpiry: false, sortOrder: 7, active: true, expectedUpdatedAt: moc } });
  assert.equal(r.status, 200, r.text);
  r = await w.call("PUT", "/api/van-chuyen/loai-giay-to-xe/SO_BAO_DUONG", { as: ADM, body: { name: "Cũ", hasExpiry: false, sortOrder: 7, active: true, expectedUpdatedAt: moc } });
  assert.equal(r.json.error.code, "stale");
  assert.equal((await w.call("PUT", "/api/van-chuyen/loai-giay-to-xe/KHONG_CO", { as: ADM, body: { name: "x", hasExpiry: true, sortOrder: 0, active: true, expectedUpdatedAt: moc } })).status, 404);
  r = await w.call("POST", "/api/van-chuyen/loai-giay-to-xe", { as: SALES, body: { code: "X_Y", name: "x" } });
  assert.equal(r.status, 403, r.text);
  assert.match(r.json.error.message, /Chỉ quản trị viên/);
  assert.deepEqual(w.q("SELECT detail FROM audit_log WHERE action = 'vehicle_document_type_changed' ORDER BY rowid").map((x: any) => x.detail), [
    "loại giấy tờ xe: SO_BAO_DUONG — Sổ bảo dưỡng", "loại giấy tờ xe: SO_BAO_DUONG — Sổ bảo dưỡng xe",
  ]);
});
