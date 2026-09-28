// Route xe của phân hệ Vận chuyển (ADR-0040 D1; Ruling R9, R15) — chạy CẢ ứng dụng (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs.
// Ô vehicle.manage: Quản trị + Toàn quyền. Mọi ca từ chối khẳng định ĐÚNG MÃ + ĐÚNG CÂU (403 của cổng office khác 403 của ô trong thân).
// R15 điểm 1, 3: biển số trùng (thêm xe, sửa xe, DÙNG LẠI xe đã ngừng) → 409 `vehicle_plate_taken` ở lớp route; lớp CSDL trả mã khác.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "55555555-5555-4555-8555-555555555555";
const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const FIELD = "22222222-2222-4222-8222-222222222222";
const PARTNER = "44444444-4444-4444-8444-444444444444";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const INTERN = "88888888-8888-4888-8888-888888888881";
const AT = "2026-09-01T00:00:00.000Z";
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const ngay = (n: number) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000002", name: "Hướng dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000004", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000008", name: "Thực tập", perms: ["INTERN"] });
  return w;
}
const XE = { plateNumber: "79B-012.34", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit", modelYear: 2019, passengerCapacity: 15 };
const themXe = (w: any, as: string, body: unknown) => w.call("POST", "/api/van-chuyen/xe", { as, body });
const suaXe = (w: any, as: string, id: string, body: unknown) => w.call("PUT", `/api/van-chuyen/xe/${id}`, { as, body });
const xeDb = (w: any, id: string) => w.q("SELECT * FROM vc_vehicle WHERE id = ?", id)[0];
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;
const nhatKyCuoi = (w: any, action: string) => w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1", action)[0];
const congTyChu = (w: any): string => w.q("SELECT party_id FROM pty_party_role WHERE role_type_code = 'OWNER_COMPANY' AND valid_to_date IS NULL")[0].party_id;
const CAU_CONG_OFFICE = /chỉ dùng cho việc được giao/;
const CAU_O_XE = /không quản lý được xe/;
/** Thân PUT đủ trường, lấy từ xe đang có + mốc cập nhật. */
function thanSua(w: any, id: string, doi: Record<string, unknown> = {}) {
  const x = xeDb(w, id);
  return { plateNumber: x.plate_number, chassisNumber: x.chassis_number, name: x.name, modelYear: x.model_year, passengerCapacity: x.passenger_capacity, status: x.status, expectedUpdatedAt: x.updated_at, ...doi };
}
let n = 0;
function giayToXe(w: any, xe: string, type: string, het: string | null, huy = false): string {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, document_number, expiry_date, voided_at, created_at, updated_at) VALUES (?, ?, ?, NULL, ?, ?, ?, ?)`)
    .run(id, xe, type, het, huy ? AT : null, AT, AT);
  return id;
}

test("quyền: Bán hàng, Kế toán × 4 route xe → 403 ĐÚNG câu của ô (vehicle.manage); Hướng dẫn viên, tài xế, Đối tác, Thực tập → 403 ở cổng office; không ghi, không nhật ký", async () => {
  const w = setup();
  const r0 = await themXe(w, ADM, XE);
  assert.equal(r0.status, 201, r0.text);
  const id = r0.json.vehicle.id;
  const n0 = soNhatKy(w);
  for (const as of [SALES, ACC]) {
    for (const r of [
      await w.call("GET", "/api/van-chuyen/xe", { as }),
      await themXe(w, as, { ...XE, plateNumber: "79B-999.99", chassisNumber: "KHUNGKHAC01" }),
      await w.call("GET", `/api/van-chuyen/xe/${id}`, { as }),
      await suaXe(w, as, id, thanSua(w, id, { name: "Đổi tên" })),
    ]) {
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.match(r.json.error.message, CAU_O_XE, `${as}: 403 của ô trong thân`);
    }
  }
  for (const as of [FIELD, DRIVER, PARTNER, INTERN]) {
    for (const r of [await w.call("GET", "/api/van-chuyen/xe", { as }), await themXe(w, as, XE), await w.call("GET", `/api/van-chuyen/xe/${id}`, { as }), await suaXe(w, as, id, thanSua(w, id))]) {
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.match(r.json.error.message, CAU_CONG_OFFICE, `${as}: chặn ở cổng office`);
    }
  }
  assert.equal(soNhatKy(w), n0);
  assert.equal(w.q("SELECT count(*) n FROM vc_vehicle")[0].n, 1);
});

test("thêm xe: Quản trị → 201; chủ xe = hồ sơ công ty chủ lúc thêm; nhật ký vehicle_created (đối tượng xe) mở đầu bằng biển số; Toàn quyền cũng thêm được", async () => {
  const w = setup();
  const r = await themXe(w, ADM, XE);
  assert.equal(r.status, 201, r.text);
  const v = r.json.vehicle;
  assert.deepEqual([v.plateNumber, v.chassisNumber, v.name, v.modelYear, v.passengerCapacity, v.status, v.validFrom, v.validTo, v.alert], ["79B-012.34", "RL4GA3FV0M1027734", "Ford Transit", 2019, 15, "active", HOM_NAY, null, "none"]);
  assert.deepEqual(r.json.documents, []);
  const row = xeDb(w, v.id);
  assert.deepEqual([row.owner_party_id, row.plate_key, row.chassis_key, row.created_by], [congTyChu(w), "79B01234", "RL4GA3FV0M1027734", ADM]);
  const nk = nhatKyCuoi(w, "vehicle_created");
  assert.deepEqual([nk.target_type, nk.target_id], ["vehicle", v.id]);
  assert.match(nk.detail, /^xe 79B-012\.34/);
  assert.equal((await themXe(w, SUP, { ...XE, plateNumber: "51F-111.11", chassisNumber: "KHUNGTOANQUYEN1" })).status, 201);
});

test("trùng (R15 điểm 3): biển số của xe chưa ngừng (viết khác cách) → 409 vehicle_plate_taken 'Biển số này đang dùng cho xe khác.'; số khung trùng → 409 vehicle_chassis_taken; thiếu số khung → 400 (R9)", async () => {
  const w = setup();
  assert.equal((await themXe(w, ADM, XE)).status, 201);
  const n0 = w.q("SELECT count(*) n FROM vc_vehicle")[0].n;
  let r = await themXe(w, ADM, { ...XE, plateNumber: "79B 012 34", chassisNumber: "KHUNGKHAC01" });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "vehicle_plate_taken", message: "Biển số này đang dùng cho xe khác." });
  r = await themXe(w, ADM, { ...XE, plateNumber: "79B-555.55", chassisNumber: "rl4ga3fv0m1027734" });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "vehicle_chassis_taken", message: "Số khung này đã có ở xe khác." });
  r = await themXe(w, ADM, { ...XE, plateNumber: "79B-555.56", chassisNumber: "" });
  assert.equal(r.status, 400, r.text);
  assert.match(r.json.error.message, /Cần số khung/);
  assert.equal(w.q("SELECT count(*) n FROM vc_vehicle")[0].n, n0);
});

test("ngừng dùng và DÙNG LẠI xe (R15 điểm 1): ngừng → validTo = hôm nay + nhật ký 'Đang dùng → Ngừng dùng'; xe mới dùng lại biển; dùng lại xe cũ khi biển đã có chủ → 409 vehicle_plate_taken; biển rảnh → dùng lại được", async () => {
  const w = setup();
  const cu = (await themXe(w, ADM, XE)).json.vehicle.id;
  let r = await suaXe(w, ADM, cu, thanSua(w, cu, { status: "retired" }));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.vehicle.status, r.json.vehicle.validTo], ["retired", HOM_NAY]);
  assert.match(nhatKyCuoi(w, "vehicle_updated").detail, /^xe 79B-012\.34: .*trạng thái Đang dùng → Ngừng dùng/);
  const moi = await themXe(w, ADM, { ...XE, chassisNumber: "KHUNGMOI0001" });
  assert.equal(moi.status, 201, `xe mới dùng lại biển của xe đã ngừng: ${moi.text}`);
  r = await suaXe(w, ADM, cu, thanSua(w, cu, { status: "active" }));
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "vehicle_plate_taken", message: "Biển số này đang dùng cho xe khác." }, "lớp route (lớp CSDL trả vehicle_plate_conflict)");
  assert.equal(xeDb(w, cu).status, "retired", "không đổi");
  assert.equal((await suaXe(w, ADM, moi.json.vehicle.id, thanSua(w, moi.json.vehicle.id, { status: "retired" }))).status, 200);
  r = await suaXe(w, ADM, cu, thanSua(w, cu, { status: "active" }));
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.vehicle.status, r.json.vehicle.validTo], ["active", null], "dùng lại xe: bỏ ngày ngừng");
  assert.match(nhatKyCuoi(w, "vehicle_updated").detail, /trạng thái Ngừng dùng → Đang dùng/);
});

test("sửa xe: đổi biển sang biển của xe khác chưa ngừng → 409 vehicle_plate_taken; khoá lạc quan (mốc cũ) → 409 stale; xe lạ → 404", async () => {
  const w = setup();
  const a = (await themXe(w, ADM, XE)).json.vehicle.id;
  const b = (await themXe(w, ADM, { ...XE, plateNumber: "51F-111.11", chassisNumber: "KHUNGB00001" })).json.vehicle.id;
  let r = await suaXe(w, ADM, b, thanSua(w, b, { plateNumber: "79B-01234" }));
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vehicle_plate_taken");
  r = await suaXe(w, ADM, b, thanSua(w, b, { chassisNumber: "RL4GA3FV0M1027734" }));
  assert.equal(r.json.error.code, "vehicle_chassis_taken");
  const cuMoc = thanSua(w, a);
  await new Promise((res) => setTimeout(res, 5)); // khoá lạc quan so mốc theo mili-giây: lần sửa đầu phải mang mốc KHÁC mốc tạo
  assert.equal((await suaXe(w, ADM, a, { ...cuMoc, name: "Ford Transit 16 chỗ", passengerCapacity: 15 })).status, 200);
  r = await suaXe(w, ADM, a, { ...cuMoc, name: "Tên cũ" });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  assert.equal((await suaXe(w, ADM, "99999999-9999-4999-8999-999999999999", thanSua(w, a))).status, 404);
  assert.equal((await w.call("GET", "/api/van-chuyen/xe/99999999-9999-4999-8999-999999999999", { as: ADM })).status, 404);
});

test("đọc: danh sách có cảnh báo giấy tờ theo ngưỡng (sắp hết / đã hết / không), bỏ dòng cũ-huỷ; chi tiết xe kèm giấy tờ (số giấy tờ XE hiện đủ — không phải dữ liệu cá nhân)", async () => {
  const w = setup();
  const x = (await themXe(w, ADM, XE)).json.vehicle.id;
  const y = (await themXe(w, ADM, { ...XE, plateNumber: "51F-111.11", chassisNumber: "KHUNGY00001" })).json.vehicle.id;
  const z = (await themXe(w, ADM, { ...XE, plateNumber: "51F-222.22", chassisNumber: "KHUNGZ00001" })).json.vehicle.id;
  giayToXe(w, x, "INSPECTION", ngay(5));
  giayToXe(w, x, "TPL_INSURANCE", ngay(200));
  giayToXe(w, y, "CONTRACT_BADGE", ngay(-8));
  giayToXe(w, y, "INSPECTION", ngay(10));
  giayToXe(w, z, "INSPECTION", ngay(2), true); // dòng đã huỷ: không tính
  giayToXe(w, z, "REGISTRATION", null);
  const r = await w.call("GET", "/api/van-chuyen/xe", { as: ADM });
  assert.equal(r.status, 200, r.text);
  const theo = (id: string) => r.json.vehicles.find((v: any) => v.id === id);
  assert.deepEqual([theo(x).alert, theo(x).alertTypeName, theo(x).alertDaysLeft, theo(x).alertCount], ["soon", "Kiểm định", 5, 1]);
  assert.deepEqual([theo(y).alert, theo(y).alertTypeName, theo(y).alertDaysLeft, theo(y).alertCount], ["expired", "Phù hiệu xe hợp đồng", -8, 2]);
  assert.deepEqual([theo(z).alert, theo(z).alertCount], ["none", 0]);
  const d = await w.call("GET", `/api/van-chuyen/xe/${x}`, { as: SUP });
  assert.equal(d.status, 200, d.text);
  assert.deepEqual(d.json.documents.map((g: any) => [g.typeCode, g.typeName, g.current, g.daysLeft]), [["INSPECTION", "Kiểm định", true, 5], ["TPL_INSURANCE", "Bảo hiểm trách nhiệm dân sự", true, 200]]);
});
