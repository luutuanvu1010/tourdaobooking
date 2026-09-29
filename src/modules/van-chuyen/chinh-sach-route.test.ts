// Route chính sách điều phối, điều kiện xuất bến, hạng bằng, danh mục lý do (ADR-0049 D2, D3; kế hoạch mục 1.7 route 9–18, Task A7, TC-2) — chạy CẢ ứng dụng
// (router + mọi module) trên SQLite thật qua tests/audit/harness.mjs. Chính sách, điều kiện, hạng bằng: cổng `office` + ô `settings.ops` (chỉ Toàn quyền);
// danh mục lý do: cổng `admin` + ô `admin.manage` (Quản trị, Toàn quyền). Mọi ca từ chối khẳng định ĐÚNG MÃ + ĐÚNG CÂU + không ghi, không nhật ký.
import { test, mock } from "node:test";
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
const soNhatKy = (w: any): number => w.q("SELECT count(*) n FROM audit_log")[0].n;
const nhatKyCuoi = (w: any, action: string) => ({ ...w.q("SELECT staff_id, order_id, target_type, target_id, detail FROM audit_log WHERE action = ? ORDER BY rowid DESC LIMIT 1", action)[0] });
const dem = (w: any, bang: string): number => w.q(`SELECT count(*) n FROM ${bang}`)[0].n;
const CAU_CONG_OFFICE = /chỉ dùng cho việc được giao/;
const CAU_CONG_ADMIN = /^Chỉ quản trị viên được thực hiện thao tác này\.$/;
const CAU_O_CHINH_SACH = /Chỉ người phụ trách hệ thống/;
const CS = { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true, proxyBackdateMaxMinutes: 90 };

const ROUTE_CHINH_SACH: [string, string, unknown][] = [
  ["GET", "/api/van-chuyen/chinh-sach-dieu-phoi", undefined],
  ["POST", "/api/van-chuyen/chinh-sach-dieu-phoi", CS],
  ["GET", "/api/van-chuyen/dieu-kien", undefined],
  ["POST", "/api/van-chuyen/dieu-kien", { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" }],
  ["POST", "/api/van-chuyen/dieu-kien/00000000-0000-4000-8000-000000000001/dong", {}],
  ["GET", "/api/van-chuyen/hang-bang", undefined],
  ["POST", "/api/van-chuyen/hang-bang", { classCode: "D2", maxPassengers: 30 }],
];

test("TC-2 quyền route 9–15: Quản trị, Bán hàng, Kế toán → 403 ĐÚNG câu của ô settings.ops; HDV, tài xế, Đối tác, Thực tập → 403 ở cổng office; không ghi, không nhật ký", async () => {
  const w = setup();
  const n0 = soNhatKy(w);
  const truoc = [dem(w, "vc_dispatch_policy"), dem(w, "vc_departure_rule"), dem(w, "vc_license_capacity")];
  for (const as of [ADM, SALES, ACC]) {
    for (const [m, p, body] of ROUTE_CHINH_SACH) {
      const r = await w.call(m, p, { as, body });
      assert.equal(r.status, 403, `${as} ${m} ${p}: ${r.text}`);
      assert.match(r.json.error.message, CAU_O_CHINH_SACH, `${as} ${m} ${p}: 403 của ô trong thân`);
    }
  }
  for (const as of [FIELD, DRIVER, PARTNER, INTERN]) {
    for (const [m, p, body] of ROUTE_CHINH_SACH) {
      const r = await w.call(m, p, { as, body });
      assert.equal(r.status, 403, `${as} ${m} ${p}: ${r.text}`);
      assert.match(r.json.error.message, CAU_CONG_OFFICE, `${as} ${m} ${p}: chặn ở cổng office`);
    }
  }
  assert.equal(soNhatKy(w), n0);
  assert.deepEqual([dem(w, "vc_dispatch_policy"), dem(w, "vc_departure_rule"), dem(w, "vc_license_capacity")], truoc);
});

test("TC-2 route 9–10: Toàn quyền xem (bản gieo 360/120/30) và thêm bản mới → 201, bản mới hiệu lực NGAY, bản cũ còn trong lịch sử; nhật ký trước → sau, không target", async () => {
  const w = setup();
  let r = await w.call("GET", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual({ ...r.json.current, id: undefined, validFrom: undefined }, {
    id: undefined, minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, requireContract: false, proxyBackdateMaxMinutes: 180,
    validFrom: undefined, current: true,
  });
  r = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body: CS });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.current.minLeadMinutes, 240);
  assert.equal(r.json.current.proxyBackdateMaxMinutes, 90, "TC-52: dòng mới mang kẹp lùi đã gửi");
  assert.equal(w.q("SELECT proxy_backdate_max_minutes k FROM vc_dispatch_policy WHERE id = ?", r.json.current.id)[0].k, 90);
  assert.equal(r.json.history.length, 2);
  assert.deepEqual(r.json.history.map((h: any) => [h.minLeadMinutes, h.current]), [[240, true], [360, false]]);
  const nk = nhatKyCuoi(w, "dispatch_policy_changed");
  assert.deepEqual(nk, {
    staff_id: SUP, order_id: null, target_type: null, target_id: null,
    detail: "chính sách điều phối: mốc tối thiểu 360 → 240 phút; cảnh báo sát mốc 120 → 60 phút; khoảng nghỉ 30 → 45 phút; bắt đủ danh sách có → có; kẹp lùi giờ khai 180 → 90 phút",
  });
});

test("TC-2 route 10: thân mang ngày hiệu lực → 400 (không nhận); hợp đồng true → 400; sai khoảng → 400; không ghi, không nhật ký", async () => {
  const w = setup();
  const n0 = soNhatKy(w);
  const { proxyBackdateMaxMinutes: _kep, ...thieuKep } = CS; // TC-52 / I43: thiếu kẹp lùi → 400 (không chép ngầm từ dòng cũ)
  for (const body of [{ ...CS, validFrom: "2026-01-01" }, { ...CS, validFromAt: "2026-01-01T00:00:00.000Z" }, { ...CS, requireContract: true }, { ...CS, minLeadMinutes: 2881 }, { ...CS, requireManifest: "có" }, null,
    thieuKep, { ...CS, proxyBackdateMaxMinutes: 0 }, { ...CS, proxyBackdateMaxMinutes: 1441 }]) {
    const r = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body });
    assert.equal(r.status, 400, `${JSON.stringify(body)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal(soNhatKy(w), n0);
  assert.equal(dem(w, "vc_dispatch_policy"), 1);
});

test("TC-2 route 10 (Ruling R19): hai lần đổi CÙNG một mili-giây → lần sau 409 stale (không 500); dòng và nhật ký của lần sau không ghi", async () => {
  const w = setup();
  mock.timers.enable({ apis: ["Date"], now: Date.now() });
  try {
    const a = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body: CS });
    assert.equal(a.status, 201, a.text);
    const n1 = soNhatKy(w);
    const b = await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body: { ...CS, minLeadMinutes: 300 } });
    assert.equal(b.status, 409, b.text);
    assert.equal(b.json.error.code, "stale");
    assert.equal(soNhatKy(w), n1);
    assert.equal(dem(w, "vc_dispatch_policy"), 2);
  } finally {
    mock.timers.reset();
  }
});

test("TC-2 route 14–15: Toàn quyền thêm hạng D2 = 30 → dòng mới hiệu lực, dòng cũ 29 còn nguyên; D = không giới hạn; hạng lạ → 400 (khoá ngoại), cùng mili-giây → 409", async () => {
  const w = setup();
  let r = await w.call("GET", "/api/van-chuyen/hang-bang", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.current.map((c: any) => [c.classCode, c.maxPassengers]), [["B", 8], ["B2_OLD", 8], ["C_OLD", 8], ["D", null], ["D1", 16], ["D2", 29], ["D_OLD", 29], ["E_OLD", null]]);
  r = await w.call("POST", "/api/van-chuyen/hang-bang", { as: SUP, body: { classCode: "D2", maxPassengers: 30 } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.current.find((c: any) => c.classCode === "D2").maxPassengers, 30);
  assert.deepEqual(w.q("SELECT max_passengers m FROM vc_license_capacity WHERE license_class_code = 'D2' ORDER BY valid_from_at").map((x: any) => x.m), [29, 30]);
  assert.equal(nhatKyCuoi(w, "license_capacity_changed").detail, "hạng bằng D2: 29 khách → 30 khách");
  const n1 = soNhatKy(w);
  for (const body of [{ classCode: "HANG_LA", maxPassengers: 8 }, { classCode: "D2", maxPassengers: 0 }, { classCode: "D2" }, { classCode: "D2", maxPassengers: 30, validFrom: "x" }]) {
    const x = await w.call("POST", "/api/van-chuyen/hang-bang", { as: SUP, body });
    assert.equal(x.status, 400, `${JSON.stringify(body)}: ${x.text}`);
  }
  assert.equal(soNhatKy(w), n1);
  mock.timers.enable({ apis: ["Date"], now: Date.now() + 5000 });
  try {
    assert.equal((await w.call("POST", "/api/van-chuyen/hang-bang", { as: SUP, body: { classCode: "B", maxPassengers: 7 } })).status, 201);
    const b = await w.call("POST", "/api/van-chuyen/hang-bang", { as: SUP, body: { classCode: "B", maxPassengers: 6 } });
    assert.equal(b.status, 409, b.text);
    assert.equal(b.json.error.code, "stale");
  } finally {
    mock.timers.reset();
  }
});

test("TC-52 (ADR-0050 VK1-C): CSDL mới — GET /dieu-kien trả ĐÚNG HAI điều kiện đang áp, gieo sẵn cho MỌI xe: Kiểm định, Bảo hiểm trách nhiệm dân sự", async () => {
  const w = setup();
  const r = await w.call("GET", "/api/van-chuyen/dieu-kien", { as: SUP });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json.rules.map((x: any) => [x.minCapacity, x.subject, x.documentTypeCode, x.documentTypeName, x.validFrom, x.validTo, x.active]), [
    [1, "VEHICLE", "INSPECTION", "Kiểm định", "2026-09-01T00:00:00.000Z", null, true],
    [1, "VEHICLE", "TPL_INSURANCE", "Bảo hiểm trách nhiệm dân sự", "2026-09-01T00:00:00.000Z", null, true],
  ]);
});

test("route 11–13 điều kiện xuất bến: thêm (xe / tài xế) → 201; loại giấy tờ lạ → 400; đóng → 200 một lần, lần hai 409, id lạ 404; nhật ký có cỡ xe + loại, không số", async () => {
  const w = setup();
  let r = await w.call("POST", "/api/van-chuyen/dieu-kien", { as: SUP, body: { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" } });
  assert.equal(r.status, 201, r.text);
  assert.equal(nhatKyCuoi(w, "departure_rule_added").detail, "điều kiện xuất bến: xe từ 16 người — giấy tờ xe Phù hiệu xe hợp đồng");
  r = await w.call("POST", "/api/van-chuyen/dieu-kien", { as: SUP, body: { minCapacity: 10, subject: "DRIVER", documentTypeCode: "HEALTH_CHECK" } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(r.json.rules.map((x: any) => [x.minCapacity, x.subject, x.documentTypeCode, x.documentTypeName, x.active]), [
    [1, "VEHICLE", "INSPECTION", "Kiểm định", true], // gieo ADR-0050 VK1-C
    [1, "VEHICLE", "TPL_INSURANCE", "Bảo hiểm trách nhiệm dân sự", true], // gieo ADR-0050 VK1-C
    [10, "DRIVER", "HEALTH_CHECK", null, true],
    [16, "VEHICLE", "CONTRACT_BADGE", "Phù hiệu xe hợp đồng", true],
  ]);
  const n1 = soNhatKy(w);
  for (const body of [{ minCapacity: 16, subject: "VEHICLE", documentTypeCode: "KHONG_CO" }, { minCapacity: 16, subject: "DRIVER", documentTypeCode: "KHONG_CO" }, { minCapacity: 0, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" }]) {
    const x = await w.call("POST", "/api/van-chuyen/dieu-kien", { as: SUP, body });
    assert.equal(x.status, 400, `${JSON.stringify(body)}: ${x.text}`);
  }
  assert.equal(soNhatKy(w), n1);
  const id = r.json.rules.find((x: any) => x.subject === "VEHICLE" && x.documentTypeCode === "CONTRACT_BADGE").id; // không phải hai dòng gieo (VK1-C)
  r = await w.call("POST", `/api/van-chuyen/dieu-kien/${id}/dong`, { as: SUP, body: {} });
  assert.equal(r.status, 200, r.text);
  const dong = r.json.rules.find((x: any) => x.id === id);
  assert.equal(dong.active, false);
  assert.ok(dong.validTo);
  assert.equal(nhatKyCuoi(w, "departure_rule_closed").detail, "điều kiện xuất bến: xe từ 16 người — giấy tờ xe Phù hiệu xe hợp đồng");
  assert.equal(w.q("SELECT closed_by FROM vc_departure_rule WHERE id = ?", id)[0].closed_by, SUP);
  const hai = await w.call("POST", `/api/van-chuyen/dieu-kien/${id}/dong`, { as: SUP, body: {} });
  assert.equal(hai.status, 409, hai.text);
  assert.equal((await w.call("POST", "/api/van-chuyen/dieu-kien/00000000-0000-4000-8000-000000000009/dong", { as: SUP, body: {} })).status, 404);
  assert.equal((await w.call("POST", "/api/van-chuyen/dieu-kien/khong-phai-uuid/dong", { as: SUP, body: {} })).status, 404);
});

test("TC-2 route 16–18 danh mục lý do: Quản trị thêm → 201; Bán hàng → 403 ở cổng admin; trùng mã → 409; sửa nhãn / ngưng có mốc → 200, mốc cũ → 409; nhóm lạ → 400; không đổi nhóm", async () => {
  const w = setup();
  let r = await w.call("GET", "/api/van-chuyen/ly-do", { as: ADM });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.reasons.length, 13);
  assert.deepEqual(r.json.reasons.find((x: any) => x.code === "PHA_LE_SU_CO"), {
    code: "PHA_LE_SU_CO", group: "PHA_LE", groupLabel: "Phá lệ", label: "Sự cố vận hành", active: true, sortOrder: 1, updatedAt: "2026-09-29T00:00:00.000Z", heThong: false,
  });
  r = await w.call("POST", "/api/van-chuyen/ly-do", { as: ADM, body: { code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "Mưa lớn", sortOrder: 3 } });
  assert.equal(r.status, 201, r.text);
  assert.equal(nhatKyCuoi(w, "trip_reason_added").detail, "lý do PHA_LE_MUA_LON (Phá lệ): Mưa lớn");
  assert.equal((await w.call("POST", "/api/van-chuyen/ly-do", { as: SUP, body: { code: "HUY_TROI_XAU", group: "HUY_CHUYEN", label: "Trời xấu" } })).status, 201, "Toàn quyền cũng được");
  const n1 = soNhatKy(w);
  for (const as of [SALES, ACC, FIELD, DRIVER, PARTNER, INTERN]) {
    for (const [m, p, body] of [["GET", "/api/van-chuyen/ly-do", undefined], ["POST", "/api/van-chuyen/ly-do", { code: "PHA_LE_X", group: "PHA_LE", label: "x" }], ["PUT", "/api/van-chuyen/ly-do/PHA_LE_KHAC", { label: "x", sortOrder: 1, active: true, expectedUpdatedAt: "x" }]] as const) {
      const x = await w.call(m, p, { as, body });
      assert.equal(x.status, 403, `${as} ${m} ${p}: ${x.text}`);
      assert.match(x.json.error.message, CAU_CONG_ADMIN, `${as}: chặn ở cổng admin`);
    }
  }
  assert.equal(soNhatKy(w), n1);
  const trung = await w.call("POST", "/api/van-chuyen/ly-do", { as: ADM, body: { code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "Khác" } });
  assert.equal(trung.status, 409, trung.text);
  assert.equal(trung.json.error.code, "code_taken");
  assert.equal((await w.call("POST", "/api/van-chuyen/ly-do", { as: ADM, body: { code: "PHA_LE_Y", group: "NHOM_LA", label: "x" } })).status, 400);
  const moc = w.q("SELECT updated_at u FROM vc_reason WHERE code = 'PHA_LE_KHAC'")[0].u;
  r = await w.call("PUT", "/api/van-chuyen/ly-do/PHA_LE_KHAC", { as: ADM, body: { label: "Lý do khác", sortOrder: 99, active: false, expectedUpdatedAt: moc } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual({ ...w.q("SELECT label, active, reason_group g FROM vc_reason WHERE code = 'PHA_LE_KHAC'")[0] }, { label: "Lý do khác", active: 0, g: "PHA_LE" });
  assert.equal(nhatKyCuoi(w, "trip_reason_updated").detail, "lý do PHA_LE_KHAC (Phá lệ): Lý do khác — ngưng dùng");
  const cu = await w.call("PUT", "/api/van-chuyen/ly-do/PHA_LE_KHAC", { as: ADM, body: { label: "Khác nữa", sortOrder: 99, active: true, expectedUpdatedAt: moc } });
  assert.equal(cu.status, 409, cu.text);
  assert.equal(cu.json.error.code, "stale");
  assert.equal((await w.call("PUT", "/api/van-chuyen/ly-do/KHONG_CO_MA", { as: ADM, body: { label: "x", sortOrder: 1, active: true, expectedUpdatedAt: moc } })).status, 404);
  assert.equal((await w.call("PUT", "/api/van-chuyen/ly-do/PHA_LE_SU_CO", { as: ADM, body: { label: "x", sortOrder: 1, active: true, expectedUpdatedAt: moc, group: "HUY_CHUYEN" } })).status, 400);
});

test("R-P22 (điều phối 29/9 đêm, siết): mã lý do HỆ THỐNG (máy tự dùng — BO_QUA_KHONG_CON_KHACH) KHÔNG ngưng được → 409 ly_do_he_thong, không ghi, không nhật ký; sửa nhãn / thứ tự vẫn được; DTO có cờ heThong đúng một mã", async () => {
  const w = setup();
  const ds = (await w.call("GET", "/api/van-chuyen/ly-do", { as: ADM })).json.reasons;
  assert.deepEqual(ds.filter((x: any) => x.heThong).map((x: any) => x.code), ["BO_QUA_KHONG_CON_KHACH"]);
  const moc = w.q("SELECT updated_at u FROM vc_reason WHERE code = 'BO_QUA_KHONG_CON_KHACH'")[0].u;
  const n0 = soNhatKy(w);
  const ngung = await w.call("PUT", "/api/van-chuyen/ly-do/BO_QUA_KHONG_CON_KHACH", { as: ADM, body: { label: "Không còn khách", sortOrder: 1, active: false, expectedUpdatedAt: moc } });
  assert.equal(ngung.status, 409, ngung.text);
  assert.equal(ngung.json.error.code, "ly_do_he_thong");
  assert.doesNotMatch(ngung.json.error.message, /[A-Z]{2,}_[A-Z]/, "câu báo lời thường, không lộ mã");
  assert.equal(w.q("SELECT active FROM vc_reason WHERE code = 'BO_QUA_KHONG_CON_KHACH'")[0].active, 1);
  assert.equal(soNhatKy(w), n0);
  const sua = await w.call("PUT", "/api/van-chuyen/ly-do/BO_QUA_KHONG_CON_KHACH", { as: ADM, body: { label: "Không còn khách ở điểm", sortOrder: 2, active: true, expectedUpdatedAt: moc } });
  assert.equal(sua.status, 200, sua.text);
});

test("nhật ký sáu hành động mới: nhóm 'Điều phối xe'; chi tiết chỉ mã, con số, nhãn danh mục — không dãy ≥ 8 chữ số, không order_id", async () => {
  const w = setup();
  await w.call("POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { as: SUP, body: CS });
  const r = await w.call("POST", "/api/van-chuyen/dieu-kien", { as: SUP, body: { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" } });
  await w.call("POST", `/api/van-chuyen/dieu-kien/${r.json.rules[0].id}/dong`, { as: SUP, body: {} });
  await w.call("POST", "/api/van-chuyen/hang-bang", { as: SUP, body: { classCode: "D1", maxPassengers: 15 } });
  await w.call("POST", "/api/van-chuyen/ly-do", { as: ADM, body: { code: "PHA_LE_MUA_LON", group: "PHA_LE", label: "Mưa lớn" } });
  const moc = w.q("SELECT updated_at u FROM vc_reason WHERE code = 'PHA_LE_MUA_LON'")[0].u;
  await w.call("PUT", "/api/van-chuyen/ly-do/PHA_LE_MUA_LON", { as: ADM, body: { label: "Mưa rất lớn", sortOrder: 1, active: true, expectedUpdatedAt: moc } });
  const rows = w.q(
    "SELECT action, order_id, detail FROM audit_log WHERE action IN ('dispatch_policy_changed','departure_rule_added','departure_rule_closed','license_capacity_changed','trip_reason_added','trip_reason_updated') ORDER BY rowid",
  );
  assert.deepEqual(rows.map((x: any) => x.action), ["dispatch_policy_changed", "departure_rule_added", "departure_rule_closed", "license_capacity_changed", "trip_reason_added", "trip_reason_updated"]);
  for (const x of rows) {
    assert.equal(x.order_id, null, x.action);
    assert.doesNotMatch(String(x.detail), /\d{8,}/, x.action);
  }
});
