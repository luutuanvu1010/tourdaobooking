// Route giấy tờ XE (ADR-0040 D1; kế hoạch Task A14) — khuôn giấy tờ của người, KHÁC ở ba chỗ: không CCCD, không che số (không phải dữ liệu cá nhân — G4; nhật ký
// vẫn không ghi số), chỉ lý do sửa sai `choXe`. Xe đã ngừng: không thêm / gia hạn giấy tờ (409 vehicle_retired). Chạy CẢ ứng dụng trên SQLite thật.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ACC = "55555555-5555-4555-8555-555555555555";
const ADM = "33333333-3333-4333-8333-333333333333";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const ngay = (n: number) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const XE = { plateNumber: "79B-012.34", chassisNumber: "RL4GA3FV0M1027734", name: "Ford Transit", modelYear: 2019, passengerCapacity: 15 };

async function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài xế", perms: ["DRIVER"] });
  const r = await w.call("POST", "/api/van-chuyen/xe", { as: ADM, body: XE });
  assert.equal(r.status, 201, r.text);
  return { w, xe: r.json.vehicle.id as string };
}
const them = (w: any, as: string, xe: string, body: unknown) => w.call("POST", `/api/van-chuyen/xe/${xe}/giay-to`, { as, body });
const giaHan = (w: any, as: string, xe: string, did: string, body: unknown = {}) => w.call("POST", `/api/van-chuyen/xe/${xe}/giay-to/${did}/gia-han`, { as, body });
const suaSai = (w: any, as: string, xe: string, did: string, body: unknown) => w.call("POST", `/api/van-chuyen/xe/${xe}/giay-to/${did}/sua-sai`, { as, body });
const dong = (w: any, did: string) => w.q("SELECT * FROM vc_vehicle_document WHERE id = ?", did)[0];
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;
const nhatKyCuoi = (w: any, action: string) => w.q("SELECT target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1", action)[0];
const dongMoiNhat = (r: any, type: string) => r.json.documents.find((d: any) => d.typeCode === type && d.current);

test("quyền: Bán hàng, Kế toán × route 16–18 → 403 ĐÚNG câu của ô (vehicle.manage); tài xế → 403 ở cổng; không ghi, không nhật ký", async () => {
  const { w, xe } = await setup();
  const r0 = await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", expiryDate: ngay(20) });
  const did = dongMoiNhat(r0, "INSPECTION").id;
  const [n0, g0] = [soNhatKy(w), w.q("SELECT count(*) n FROM vc_vehicle_document")[0].n];
  for (const as of [SALES, ACC]) {
    for (const r of [
      await them(w, as, xe, { typeCode: "TPL_INSURANCE", expiryDate: ngay(100) }),
      await giaHan(w, as, xe, did, { expiryDate: ngay(400) }),
      await suaSai(w, as, xe, did, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: dong(w, did).updated_at }),
    ]) {
      assert.equal(r.status, 403, `${as}: ${r.text}`);
      assert.match(r.json.error.message, /không quản lý được xe/);
    }
  }
  const r = await them(w, DRIVER, xe, { typeCode: "TPL_INSURANCE" });
  assert.equal(r.status, 403, r.text);
  assert.match(r.json.error.message, /chỉ dùng cho việc được giao/);
  assert.deepEqual([soNhatKy(w), w.q("SELECT count(*) n FROM vc_vehicle_document")[0].n], [n0, g0]);
});

test("thêm: Quản trị thêm Kiểm định hết hạn sau 20 ngày → 201, số giấy tờ XE hiện đủ; nhật ký vehicle_created… 'xe <biển>: Kiểm định, hết hạn …' KHÔNG số; loại không hạn kèm ngày hết hạn → 400", async () => {
  const { w, xe } = await setup();
  const r = await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", issuedDate: HOM_NAY, expiryDate: ngay(20) });
  assert.equal(r.status, 201, r.text);
  const d = dongMoiNhat(r, "INSPECTION");
  assert.deepEqual([d.number, d.typeName, d.daysLeft, d.current], ["KD-0456", "Kiểm định", 20, true]);
  assert.equal(r.json.vehicle.alert, "soon", "cảnh báo của xe đổi theo");
  const nk = nhatKyCuoi(w, "vehicle_document_added");
  assert.deepEqual({ ...nk }, { target_type: "vehicle", target_id: xe, detail: `xe 79B-012.34: Kiểm định, hết hạn ${ngay(20)}` });
  assert.ok(!nk.detail.includes("0456"), "nhật ký không số giấy tờ (luật chung — G4)");
  const x = await them(w, ADM, xe, { typeCode: "REGISTRATION", expiryDate: ngay(100) });
  assert.equal(x.status, 400, x.text);
  assert.equal((await them(w, ADM, "99999999-9999-4999-8999-999999999999", { typeCode: "INSPECTION" })).status, 404);
});

test("gia hạn: KHÔNG gửi số → chép số cũ; dòng cũ thành lịch sử; gia hạn dòng cũ lần nữa → 409 document_not_current; nhật ký 'gia hạn' không số", async () => {
  const { w, xe } = await setup();
  const did = dongMoiNhat(await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", expiryDate: ngay(20) }), "INSPECTION").id;
  const r = await giaHan(w, ADM, xe, did, { issuedDate: HOM_NAY, expiryDate: ngay(385) });
  assert.equal(r.status, 201, r.text);
  const moi = dongMoiNhat(r, "INSPECTION");
  assert.deepEqual([moi.previousId, moi.number, dong(w, moi.id).document_number], [did, "KD-0456", "KD-0456"]);
  assert.equal(r.json.documents.find((d: any) => d.id === did).current, false);
  assert.equal(nhatKyCuoi(w, "vehicle_document_renewed").detail, `xe 79B-012.34: Kiểm định: gia hạn, hết hạn ${ngay(20)} → ${ngay(385)}`);
  const x = await giaHan(w, ADM, xe, did, { expiryDate: ngay(500) });
  assert.equal(x.status, 409, x.text);
  assert.equal(x.json.error.code, "document_not_current", "lớp route (lớp CSDL trả document_changed)");
});

test("sửa sai: dòng cũ → 409 document_not_current; 'Nhập sai nơi cấp' / 'Nhập sai hạng' → 400 (không dùng cho xe); ngày hết hạn → 200 + nhật ký trước→sau; 'Nhập nhầm cả dòng' → huỷ; mốc cũ → 409 stale", async () => {
  const { w, xe } = await setup();
  const d1 = dongMoiNhat(await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", expiryDate: ngay(20) }), "INSPECTION").id;
  const d2 = dongMoiNhat(await giaHan(w, ADM, xe, d1, { expiryDate: ngay(385) }), "INSPECTION").id;
  let r = await suaSai(w, ADM, xe, d1, { reason: "SAI_NGAY_HET_HAN", value: ngay(21), expectedUpdatedAt: dong(w, d1).updated_at });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "document_not_current");
  for (const reason of ["SAI_NOI_CAP", "SAI_HANG"]) {
    r = await suaSai(w, ADM, xe, d2, { reason, value: "x", expectedUpdatedAt: dong(w, d2).updated_at });
    assert.equal(r.status, 400, `${reason}: ${r.text}`);
  }
  const moc = dong(w, d2).updated_at;
  r = await suaSai(w, ADM, xe, d2, { reason: "SAI_NGAY_HET_HAN", value: ngay(390), expectedUpdatedAt: moc });
  assert.equal(r.status, 200, r.text);
  assert.equal(nhatKyCuoi(w, "vehicle_document_corrected").detail, `xe 79B-012.34: Kiểm định: Nhập sai ngày hết hạn (${ngay(385)} → ${ngay(390)})`);
  r = await suaSai(w, ADM, xe, d2, { reason: "SAI_SO", value: "KD-0457", expectedUpdatedAt: moc });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "stale");
  r = await suaSai(w, ADM, xe, d2, { reason: "SAI_SO", value: "KD-0457", expectedUpdatedAt: dong(w, d2).updated_at });
  assert.equal(r.status, 200, r.text);
  assert.equal(nhatKyCuoi(w, "vehicle_document_corrected").detail, "xe 79B-012.34: Kiểm định: Nhập sai số");
  r = await suaSai(w, ADM, xe, d2, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: dong(w, d2).updated_at });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual([r.json.documents.find((d: any) => d.id === d2).voided, r.json.documents.find((d: any) => d.id === d1).current], [true, true], "huỷ dòng gia hạn → dòng trước sống lại");
  for (const x of w.q("SELECT detail FROM audit_log WHERE action LIKE 'vehicle_document_%'")) assert.ok(!String(x.detail).includes("KD-04"), `nhật ký không số: ${x.detail}`);
});

test("xe đã ngừng: thêm / gia hạn giấy tờ → 409 vehicle_retired 'Xe đã ngừng dùng.'; sửa sai dữ liệu cũ vẫn được", async () => {
  const { w, xe } = await setup();
  const did = dongMoiNhat(await them(w, ADM, xe, { typeCode: "INSPECTION", number: "KD-0456", expiryDate: ngay(20) }), "INSPECTION").id;
  const v = w.q("SELECT * FROM vc_vehicle WHERE id = ?", xe)[0];
  const ngung = await w.call("PUT", `/api/van-chuyen/xe/${xe}`, { as: ADM, body: { ...XE, status: "retired", expectedUpdatedAt: v.updated_at } });
  assert.equal(ngung.status, 200, ngung.text);
  let r = await them(w, ADM, xe, { typeCode: "TPL_INSURANCE", expiryDate: ngay(100) });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "vehicle_retired", message: "Xe đã ngừng dùng." });
  r = await giaHan(w, ADM, xe, did, { expiryDate: ngay(400) });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "vehicle_retired");
  r = await suaSai(w, ADM, xe, did, { reason: "SAI_NGAY_HET_HAN", value: ngay(22), expectedUpdatedAt: dong(w, did).updated_at });
  assert.equal(r.status, 200, r.text);
});
