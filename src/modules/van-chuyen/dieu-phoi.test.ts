// ROUTE VĂN PHÒNG của chuyến xe (ADR-0049 D1–D3 lát 1.5; ADR-0050 VK1-B route 40; kế hoạch Task A13 — TC-30, TC-31, TC-34, TC-42, TC-44 (route), TC-48 (máy
// chủ thật), TC-50 (DTO văn phòng), TC-51, TC-53; ruling R-P12, R-P13, R-P16, R-P20; I38). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs), mốc
// THẬT (chính sách gieo 360 phút). Khung gieo xe có Kiểm định + Bảo hiểm HIỆN HÀNH (kế hoạch mục 4 điểm 19 — không đóng điều kiện gieo để "cho qua").
// Tên khách, số giấy tờ là GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const DRIVER = "66666666-6666-4666-8666-666666666666";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const AT = "2026-09-01T00:00:00.000Z";
const PHUT = 60_000;
/** Ngày + giờ VN cách bây giờ `phut` phút. */
const vnSau = (phut: number) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * PHUT).toISOString();
  return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
};
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
const uuid = () => crypto.randomUUID();
let so = 0;

function setup(tuyChon: Record<string, unknown> = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế Toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: DRIVER, phone: "0900000006", name: "Tài Xế Tài Khoản", perms: ["DRIVER"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối Tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực Tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
/** Tài xế công ty (vai DRIVER_INTERNAL) có GPLX hạng `hang` hết hạn `het` (số GIẢ). */
function taiXe(w: any, ten: string, v: { hang?: string; het?: string | null; vai?: boolean } = {}): string {
  const id = `p-tx-${++so}`;
  w.sqlite.exec(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', 1, '${AT}', '${AT}')`);
  w.sqlite.exec(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
  if (v.vai !== false) {
    w.sqlite.exec(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${so}', '${id}', 'DRIVER_INTERNAL', NULL, '2026-09-01', '${AT}', '${AT}')`);
  }
  w.sqlite.prepare(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, license_class_code, expiry_date, created_at, updated_at)
    VALUES (?, ?, 'GPLX', ?, ?, ?, ?, ?, ?)`).run(`g-${so}`, id, `7900000000${String(so).padStart(2, "0")}`, `7900000000${String(so).padStart(2, "0")}`, v.hang ?? "D1", v.het === undefined ? "2030-12-31" : v.het, AT, AT);
  return id;
}
/** Xe của công ty chủ, `cho` chỗ, có Kiểm định + Bảo hiểm còn hạn (VK1-C). */
function xe(w: any, cho = 15): string {
  const id = uuid();
  const chu = w.q("SELECT party_id FROM v_pty_owner_company")[0].party_id;
  const bien = `79B${String(++so).padStart(5, "0")}`;
  w.sqlite.prepare(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, ?, ?, 'active', '2026-09-01', ?, ?)`).run(id, bien, bien, `KHUNG${so}`, `KHUNG${so}`, cho, chu, AT, AT);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    w.sqlite.prepare(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES (?, ?, ?, '2030-12-31', ?, ?)`).run(uuid(), id, loai, AT, AT);
  }
  return id;
}
const leg = (ngay: string, gio: string, noiDon: { place?: string; locId?: string } = {}) =>
  ({ direction: "OUT", pickupDate: ngay, pickupTime: gio, pickupLocationId: noiDon.locId ?? null, pickupPlace: noiDon.locId ? "" : (noiDon.place ?? "Khách sạn Dò Tìm"), dropoffLocationId: LOC, dropoffPlace: "" });
/** Đơn ĐÃ XÁC NHẬN (Bán hàng lập, xác nhận) — một dịch vụ `soNguoi` người lớn, một chặng chiều đi; `ten` hành khách có tên (GIẢ). */
async function don(w: any, v: { ngay: string; gio: string; soNguoi?: number; ten?: number; noiDon?: { place?: string; locId?: string }; handler?: string; xacNhan?: boolean }) {
  const soNguoi = v.soNguoi ?? 2;
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: "Khách Thử", customerPhone: "0912345678", ...(v.handler ? { handlerStaffId: v.handler } : {}),
      services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate: v.ngay, legs: [leg(v.ngay, v.gio, v.noiDon)] }],
      passengers: Array.from({ length: v.ten ?? soNguoi }, (_x, i) => ({ fullName: `Khách Dò Tìm ${i + 1}`, birthYear: 1990 + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  if (v.xacNhan !== false) {
    const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
    assert.equal(x.status, 200, x.text);
  }
  const p = await w.call("GET", `/api/orders/${o.id}/passengers`, { as: SALES });
  return { id: o.id as string, code: o.orderCode as string, legId: o.services[0].legs[0].id as string, personKeys: (p.json.passengers as any[]).map((x) => x.personKey as string) };
}
async function taoChuyen(w: any, as: string, v: { xe: string; taiXe: string; batDau: { ngay: string; gio: string }; ketThuc?: { ngay: string; gio: string }; nghiPhaLe?: unknown }) {
  const bd = Date.parse(`${v.batDau.ngay}T${v.batDau.gio}:00+07:00`);
  const kt = v.ketThuc ?? (() => {
    const iso = new Date(bd + 7 * 3600e3 + 2 * 3600e3).toISOString();
    return { ngay: iso.slice(0, 10), gio: iso.slice(11, 16) };
  })();
  return w.call("POST", "/api/van-chuyen/chuyen", { as, body: { requestId: uuid(), xeId: v.xe, taiXePartyId: v.taiXe, batDau: v.batDau, ketThuc: kt, ...(v.nghiPhaLe ? { nghiPhaLe: v.nghiPhaLe } : {}) } });
}
const chiTiet = async (w: any, id: string, as = SALES) => (await w.call("GET", `/api/van-chuyen/chuyen/${id}`, { as })).json;
const xep = (w: any, as: string, c: any, chang: unknown[], extra: Record<string, unknown> = {}) =>
  w.call("POST", `/api/van-chuyen/chuyen/${c.chuyen.id}/phan-bo`, { as, body: { version: c.chuyen.version, requestId: uuid(), chang, ...extra } });
const KHOA_NOI_RE = /\b[LT]:[0-9a-f-]{8,}/;

// ---- TC-30 quyền + khoá lạc quan -----------------------------------------------------------------------------------------------------------------------
test("TC-30: Bán hàng tạo chuyến → 201; Kế toán xem lịch / chi tiết → 200 nhưng tạo / xếp → 403; HDV, Đối tác, Thực tập, Tài xế → 403 ở cổng office", async () => {
  const w = setup();
  const t = await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "07:00" } });
  assert.equal(t.status, 201, t.text);
  assert.match(t.json.chuyen.ma, /^CX-\d{4}-01$/);
  assert.equal((await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as: ACC })).status, 200);
  assert.equal((await w.call("GET", `/api/van-chuyen/chuyen/${t.json.chuyen.id}`, { as: ACC })).status, 200);
  assert.equal((await taoChuyen(w, ACC, { xe: xe(w), taiXe: taiXe(w, "Tài Xế Bình"), batDau: { ngay: inDays(3), gio: "07:00" } })).status, 403);
  assert.equal((await xep(w, ACC, t.json, [{ legId: uuid(), soSuat: 1 }])).status, 403);
  for (const as of [FIELD, PARTNER, INTERN, DRIVER]) {
    const r = await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as });
    assert.equal(r.status, 403, `${as}: ${r.text}`);
  }
});

test("TC-30: hai người sửa cùng version → đúng MỘT 200, người sau 409 stale", async () => {
  const w = setup();
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "07:00" } })).json;
  const sua = (gio: string) => w.call("PUT", `/api/van-chuyen/chuyen/${t.chuyen.id}`, { as: SALES, body: { version: t.chuyen.version, requestId: uuid(), batDau: { ngay: inDays(2), gio } } });
  const a = await sua("07:10");
  const b = await sua("07:20");
  assert.equal(a.status, 200, a.text);
  assert.equal(b.status, 409, b.text);
  assert.equal(b.json.error.code, "stale");
});

// ---- TC-42 / TC-31 mốc lúc xếp, phá lệ ------------------------------------------------------------------------------------------------------------------
test("TC-42 (Q2 = (a)): Bán hàng TẠO chuyến trong 6 giờ → 201 không phá lệ; xếp chặng CHƯA đặt gấp → 409 can_pha_le (canQuyen false); Bán hàng gửi phaLe → 403; Quản trị phaLe → 200, sự kiện có luật + lý do + chính sách", async () => {
  const w = setup();
  const t = await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: vnSau(120) });
  assert.equal(t.status, 201, t.text);
  assert.equal(t.json.chuyen.khoaMoc.dangKhoa, true, "R-P13: trong mốc");
  const d = await don(w, { ngay: inDays(1), gio: "23:00" });
  const r = await xep(w, SALES, t.json, [{ legId: d.legId, soSuat: 2 }]);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "can_pha_le");
  assert.equal(r.json.error.canQuyen, false);
  assert.deepEqual(r.json.error.lyDo.map((l: any) => l.ma), ["MOC_TOI_THIEU"]);
  assert.equal((await xep(w, SALES, t.json, [{ legId: d.legId, soSuat: 2 }], { phaLe: { lyDo: "PHA_LE_SU_CO" } })).status, 403);
  assert.equal((await xep(w, ADM, t.json, [{ legId: d.legId, soSuat: 2 }])).json.error.canQuyen, true);
  const ok = await xep(w, ADM, t.json, [{ legId: d.legId, soSuat: 2 }], { phaLe: { lyDo: "PHA_LE_SU_CO" } });
  assert.equal(ok.status, 200, ok.text);
  const ev = w.q("SELECT override_rule_code r, override_reason_code l, policy_id p FROM vc_trip_event WHERE kind = 'ALLOCATED'")[0];
  assert.deepEqual({ ...ev }, { r: "MOC_TOI_THIEU", l: "PHA_LE_SU_CO", p: "d53b6dd9-60e2-4644-8e63-9ca7dcff35d0" });
  assert.equal(ok.json.suat.length, 2);
});

test("TC-42 / TC-31: xếp chặng ĐÃ ĐẶT GẤP vào chuyến trong 6 giờ → 200 không phá lệ; trong mốc: đổi tài xế, đổi xe, rút, huỷ có khách → 409 can_pha_le; đổi thứ tự / giờ xe tới → 200", async () => {
  const w = setup();
  const tx2 = taiXe(w, "Tài Xế Bình");
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: vnSau(120) })).json;
  const d = await don(w, { ngay: inDays(1), gio: "23:00" });
  assert.equal((await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
  const r = await xep(w, SALES, t, [{ legId: d.legId, soSuat: 2 }]);
  assert.equal(r.status, 200, r.text);
  let c = r.json;
  const sua = (body: Record<string, unknown>, as = SALES) => w.call("PUT", `/api/van-chuyen/chuyen/${t.chuyen.id}`, { as, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
  for (const body of [{ taiXePartyId: tx2 }, { xeId: xe(w) }]) {
    const x = await sua(body);
    assert.equal(x.status, 409, x.text);
    assert.equal(x.json.error.code, "can_pha_le");
  }
  const rut = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/rut`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), suatIds: [c.suat[0].id] } });
  assert.equal(rut.status, 409, rut.text);
  assert.equal(rut.json.error.code, "can_pha_le");
  const huy = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/huy`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" } });
  assert.equal(huy.status, 409, huy.text);
  const diem = c.diem.map((x: any, i: number) => ({ id: x.id, thuTu: c.diem.length - i, gioXeToi: null }));
  const thuTu = await sua({ diem });
  assert.equal(thuTu.status, 200, thuTu.text);
  c = thuTu.json;
  const doiTx = await sua({ taiXePartyId: tx2, phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM);
  assert.equal(doiTx.status, 200, doiTx.text);
  assert.equal(doiTx.json.chuyen.taiXe.partyId, tx2);
});

test("TC-31 khoảng nghỉ: chuyến sau cùng xe bắt đầu 10 phút sau chuyến trước → 409 chua_du_nghi; Quản trị nghiPhaLe → 201, rest_override_reason_code có", async () => {
  const w = setup();
  const x = xe(w);
  const ngay = inDays(2);
  assert.equal((await taoChuyen(w, SALES, { xe: x, taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay, gio: "07:00" }, ketThuc: { ngay, gio: "09:00" } })).status, 201);
  const r = await taoChuyen(w, SALES, { xe: x, taiXe: taiXe(w, "Tài Xế Bình"), batDau: { ngay, gio: "09:10" }, ketThuc: { ngay, gio: "10:00" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "chua_du_nghi");
  const ok = await taoChuyen(w, ADM, { xe: x, taiXe: taiXe(w, "Tài Xế Cường"), batDau: { ngay, gio: "09:10" }, ketThuc: { ngay, gio: "10:00" }, nghiPhaLe: { lyDo: "PHA_LE_KHAC" } });
  assert.equal(ok.status, 201, ok.text);
  assert.equal(w.q("SELECT rest_override_reason_code r FROM vc_trip WHERE id = ?", ok.json.chuyen.id)[0].r, "PHA_LE_KHAC");
  assert.equal((await taoChuyen(w, SALES, { xe: x, taiXe: taiXe(w, "Tài Xế Dũng"), batDau: { ngay, gio: "08:00" }, ketThuc: { ngay, gio: "08:30" } })).json.error.code, "trung_gio_xe");
});

test("TC-31 LC-12 ở route: GPLX hạng B lái xe 15 chỗ → 409 khong_du_dieu_kien_lai; GPLX hết hạn trước giờ kết thúc → 409; hạng không có dòng số khách → 409; LC-13: hồ sơ KHÔNG mở vai tài xế công ty lái xe công ty → 409 cheo_xe_tai_xe", async () => {
  const w = setup();
  const x = xe(w);
  const bd = { ngay: inDays(2), gio: "07:00" };
  const ma = async (tx: string) => (await taoChuyen(w, SALES, { xe: x, taiXe: tx, batDau: bd })).json.error.code;
  assert.equal(await ma(taiXe(w, "Hạng B", { hang: "B" })), "khong_du_dieu_kien_lai");
  assert.equal(await ma(taiXe(w, "Hết Hạn", { het: inDays(1) })), "khong_du_dieu_kien_lai");
  w.sqlite.exec("INSERT INTO pty_license_class (code, name, sort_order, active, created_at, updated_at) SELECT 'X9', 'Hạng lạ', 99, 1, created_at, updated_at FROM pty_license_class LIMIT 1");
  assert.equal(await ma(taiXe(w, "Hạng Lạ", { hang: "X9" })), "khong_du_dieu_kien_lai");
  assert.equal(await ma(taiXe(w, "Không Vai", { vai: false })), "cheo_xe_tai_xe");
});

// ---- TC-44 khoá dính qua route ---------------------------------------------------------------------------------------------------------------------------
test("TC-44 (R-P6 / R-P7) qua route: chuyến trong mốc; dời giờ ra xa → 200 (dời giờ không khoá); đổi tài xế → VẪN 409 can_pha_le (khoá dính); Quản trị phá lệ → 200; chuyến dời từ xa không bị khoá thừa", async () => {
  const w = setup();
  const tx2 = taiXe(w, "Tài Xế Bình");
  let c = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: vnSau(120) })).json;
  const sua = (body: Record<string, unknown>, as = SALES) => w.call("PUT", `/api/van-chuyen/chuyen/${c.chuyen.id}`, { as, body: { version: c.chuyen.version, requestId: uuid(), ...body } });
  const xa = vnSau(12 * 60);
  const doi = await sua({ batDau: xa, ketThuc: vnSau(14 * 60) });
  assert.equal(doi.status, 200, doi.text);
  c = doi.json;
  assert.equal(c.chuyen.khoaMoc.dangKhoa, true, "khoá DÍNH: vẫn khoá dù giờ đã xa");
  const r = await sua({ taiXePartyId: tx2 });
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "can_pha_le");
  assert.equal((await sua({ taiXePartyId: tx2, phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM)).status, 200);
  // Đối chứng: chuyến tạo XA (chưa từng vào vùng) → đổi tài xế không cần phá lệ.
  const xaTuDau = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế Cường"), batDau: vnSau(20 * 60) })).json;
  assert.equal(xaTuDau.chuyen.khoaMoc.dangKhoa, false);
  const ok = await w.call("PUT", `/api/van-chuyen/chuyen/${xaTuDau.chuyen.id}`, { as: SALES, body: { version: xaTuDau.chuyen.version, requestId: uuid(), taiXePartyId: taiXe(w, "Tài Xế Dũng") } });
  assert.equal(ok.status, 200, ok.text);
});

// ---- TC-34 nhật ký chuyến ----------------------------------------------------------------------------------------------------------------------------------
test("TC-34 (I17): mọi dòng nhật ký trip_* có order_id NULL; lịch sử đơn của HDV phụ trách không có hành động trip_* hay mã chuyến", async () => {
  const w = setup();
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay: inDays(1), gio: "23:30" }, ketThuc: { ngay: inDays(2), gio: "01:00" } })).json;
  const d = await don(w, { ngay: inDays(1), gio: "23:40", handler: FIELD });
  assert.equal((await xep(w, SALES, t, [{ legId: d.legId, soSuat: 2, personKeys: d.personKeys.slice(0, 1) }])).status, 200);
  const dong = w.q("SELECT action, order_id FROM audit_log WHERE action LIKE 'trip\\_%' ESCAPE '\\' AND action NOT IN ('trip_updated')");
  assert.ok(dong.length >= 2, "chống bài rỗng");
  for (const r of dong) assert.equal(r.order_id, null, r.action);
  const ls = (await w.call("GET", `/api/orders/${d.id}`, { as: FIELD })).json.history;
  assert.ok(!ls.some((e: any) => /^trip_(created|edited|cancelled|allocat)/.test(e.action)), JSON.stringify(ls));
  assert.ok(!JSON.stringify(ls).includes(t.chuyen.ma));
});

// ---- TC-48 / TC-50 / TC-51 / TC-53 / R-P16 — nơi hẹn đổi sau khi xếp ---------------------------------------------------------------------------------------
async function daXep(w: any, noiDon: string) {
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "06:00" }, ketThuc: { ngay: inDays(2), gio: "09:00" } })).json;
  const d = await don(w, { ngay: inDays(2), gio: "06:30", noiDon: { place: noiDon } });
  const r = await xep(w, SALES, t, [{ legId: d.legId, soSuat: 2, personKeys: d.personKeys }]);
  assert.equal(r.status, 200, r.text);
  return { t, d, c: r.json };
}
async function doiNoiDon(w: any, d: any, noiDon: string) {
  const o = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order;
  const l = o.services[0].legs[0];
  const r = await w.call("PUT", `/api/orders/${d.id}/legs/${l.id}`, {
    as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: noiDon, dropoffLocationId: LOC, dropoffPlace: "" } },
  });
  assert.equal(r.status, 200, r.text);
}
test("TC-48 (máy chủ thật, khoá do lichChungChang tính): hai nơi tự do CHỈ khác ở dãy 8 chữ số (chữ đã che giống nhau) → vẫn giữ NOI_HEN_DOI; R-P16 cờ lechDon; TC-53 cảnh báo NOI_HEN_KHAC_DIEM", async () => {
  const w = setup();
  const { t, d, c } = await daXep(w, "Căn hộ 12345678 Trần Phú");
  assert.deepEqual(c.chuyen.lyDoGiu.map((l: any) => l.ma), [], JSON.stringify(c.chuyen.lyDoGiu));
  assert.equal(c.diem.find((x: any) => x.loai === "PICKUP").lechDon, false);
  await doiNoiDon(w, d, "Căn hộ 87654321 Trần Phú");
  const sau = await chiTiet(w, t.chuyen.id);
  assert.equal(sau.diem.find((x: any) => x.loai === "PICKUP").tenNoi, "Căn hộ •••••••• Trần Phú", "chữ hiển thị đã che");
  assert.deepEqual(sau.chuyen.lyDoGiu.map((l: any) => l.ma), ["NOI_HEN_DOI"]);
  assert.equal(sau.diem.find((x: any) => x.loai === "PICKUP").lechDon, true, "R-P16");
  assert.ok(sau.canhBao.some((x: any) => x.loai === "NOI_HEN_KHAC_DIEM"));
  const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as: SALES })).json;
  assert.ok(lich.canhBao.some((x: any) => x.loai === "NOI_HEN_KHAC_DIEM"), "TC-53 trên lịch chung");
  assert.deepEqual(lich.chuyen[0].lyDoGiu.map((l: any) => l.ma), ["NOI_HEN_DOI"]);
});

test("TC-50: DTO lịch chung + chi tiết chuyến KHÔNG có khoá so sánh nơi (khoá, chuỗi L:… / T:…), không SĐT khách; chi tiết văn phòng có họ tên + năm sinh (R-P1)", async () => {
  const w = setup();
  const { t } = await daXep(w, "Khách sạn 12345678");
  for (const as of [SALES, ACC]) {
    const txt = [JSON.stringify(await chiTiet(w, t.chuyen.id, as)), (await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as })).text].join("\n");
    assert.doesNotMatch(txt, KHOA_NOI_RE);
    assert.doesNotMatch(txt, /khoaNoi|placeKey|place_key/);
    assert.doesNotMatch(txt, /0912345678/, "không SĐT khách");
  }
  const ct = await chiTiet(w, t.chuyen.id);
  assert.deepEqual(ct.suat.map((s: any) => s.hoTen).sort(), ["Khách Dò Tìm 1", "Khách Dò Tìm 2"]);
  const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as: SALES })).text;
  assert.doesNotMatch(lich, /Khách Dò Tìm/, "lịch chung không tên khách");
});

test("TC-51 cập nhật điểm theo đơn: đổi nơi đón sau khi xếp → 200 daCapNhat 2; suất cũ đóng STOP_CHANGED, suất mới cùng chặng + cùng người ở điểm MỚI; điểm cũ SKIPPED BO_QUA_KHONG_CON_KHACH; hết giữ; nhật ký 'nơi tự do'; lần hai version cũ → 200 / 0", async () => {
  const w = setup();
  const { t, d, c } = await daXep(w, "Sheraton 12345678");
  await doiNoiDon(w, d, "Amiana 12345678");
  const cap = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/cap-nhat-diem`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid() } });
  assert.equal(cap.status, 200, cap.text);
  assert.equal(cap.json.daCapNhat, 2);
  assert.deepEqual(cap.json.chuyen.lyDoGiu.map((l: any) => l.ma), []);
  const dong = w.q("SELECT close_reason r, passenger_key k, leg_id l FROM vc_trip_allocation WHERE valid_to_at IS NOT NULL ORDER BY passenger_key");
  assert.deepEqual(dong.map((x: any) => x.r), ["STOP_CHANGED", "STOP_CHANGED"]);
  const mo = w.q("SELECT passenger_key k, leg_id l, board_stop_id b, status s FROM vc_trip_allocation WHERE valid_to_at IS NULL ORDER BY passenger_key");
  assert.deepEqual(mo.map((x: any) => [x.k, x.l, x.s]), dong.map((x: any) => [x.k, x.l, "WAITING"]));
  const cu = c.diem.find((x: any) => x.loai === "PICKUP").id;
  assert.deepEqual({ ...w.q("SELECT status s, skip_reason_code r FROM vc_trip_stop WHERE id = ?", cu)[0] }, { s: "SKIPPED", r: "BO_QUA_KHONG_CON_KHACH" });
  assert.notEqual(mo[0].b, cu);
  const nk = w.q("SELECT detail, order_id FROM audit_log WHERE action = 'trip_stops_synced'")[0];
  assert.equal(nk.order_id, null);
  assert.match(nk.detail, /điểm đón nơi tự do → nơi tự do/);
  assert.doesNotMatch(nk.detail, /Sheraton|Amiana|12345678|T:/);
  const lan2 = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/cap-nhat-diem`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid() } });
  assert.equal(lan2.status, 200, lan2.text);
  assert.equal(lan2.json.daCapNhat, 0, "không suất nào lệch → 200 / 0 dù version cũ");
  assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/cap-nhat-diem`, { as: ACC, body: { version: 1, requestId: uuid() } })).status, 403);
});

test("TC-51: TRONG 6 giờ Bán hàng cập nhật điểm → 200 không cần phá lệ (DOI_DIEM_THEO_CHANG ngoài danh sách khoá)", async () => {
  const w = setup();
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: vnSau(120) })).json;
  const d = await don(w, { ngay: inDays(1), gio: "23:00", noiDon: { place: "Sheraton" } });
  assert.equal((await w.call("POST", `/api/orders/${d.id}/legs/${d.legId}/short-notice`, { as: ADM, body: { lyDo: "KHACH_DOAN_GOI_GAP" } })).status, 200);
  const c = (await xep(w, SALES, t, [{ legId: d.legId, soSuat: 2 }])).json;
  const o = (await w.call("GET", `/api/orders/${d.id}`, { as: ADM })).json.order;
  const l = o.services[0].legs[0];
  // chặng xa hơn mốc (23:00 ngày mai) — Bán hàng sửa nơi đón được; dấu đặt gấp cũ bị bỏ (I16) nhưng chặng đã ở trên xe.
  const sua = await w.call("PUT", `/api/orders/${d.id}/legs/${l.id}`, { as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Amiana", dropoffLocationId: LOC, dropoffPlace: "" } } });
  assert.equal(sua.status, 200, sua.text);
  const cap = await w.call("POST", `/api/van-chuyen/chuyen/${t.chuyen.id}/cap-nhat-diem`, { as: SALES, body: { version: c.chuyen.version, requestId: uuid() } });
  assert.equal(cap.status, 200, cap.text);
  assert.equal(cap.json.daCapNhat, 2);
});

// ---- I38 lý do cụ thể ---------------------------------------------------------------------------------------------------------------------------------------
test("I38 (R-P9): xếp rồi HUỶ ĐƠN → chi tiết chuyến giữ DON_DA_HUY (không NOI_HEN_DOI); xếp rồi BỎ CHẶNG → CHANG_DA_DONG; xếp chặng của đơn NHÁP → 409 lý do cụ thể", async () => {
  const w = setup();
  const { t, d } = await daXep(w, "Khách sạn A");
  assert.equal((await w.call("POST", `/api/orders/${d.id}/status`, { as: SALES, body: { status: "cancelled" } })).status, 200);
  const ct = await chiTiet(w, t.chuyen.id);
  assert.deepEqual(ct.chuyen.lyDoGiu.map((l: any) => l.ma), ["DON_DA_HUY"]);
  assert.match(ct.chuyen.lyDoGiu[0].loiNhan, new RegExp(d.code));
  const w2 = setup();
  const b = await daXep(w2, "Khách sạn B");
  const o = (await w2.call("GET", `/api/orders/${b.d.id}`, { as: SALES })).json.order;
  const dongChang = await w2.call("POST", `/api/orders/${b.d.id}/legs/${b.d.legId}/close`, { as: SALES, body: { expectedUpdatedAt: o.services[0].legs[0].updatedAt, reasonCode: "NOT_NEEDED" } });
  assert.equal(dongChang.status, 200, dongChang.text);
  assert.deepEqual((await chiTiet(w2, b.t.chuyen.id)).chuyen.lyDoGiu.map((l: any) => l.ma), ["CHANG_DA_DONG"]);
  const nhap = await don(w2, { ngay: inDays(2), gio: "06:30", xacNhan: false });
  const c2 = await chiTiet(w2, b.t.chuyen.id);
  const r = await xep(w2, SALES, c2, [{ legId: nhap.legId, soSuat: 1 }]);
  assert.equal(r.status, 409, r.text);
  assert.equal(r.json.error.code, "chang_khong_hop_le");
  assert.deepEqual(r.json.error.lyDo.map((l: any) => l.ma), ["CHANG_KHONG_HOP_LE"]);
});

// ---- R-P12 / R-P20 --------------------------------------------------------------------------------------------------------------------------------------
test("R-P12: GET /lich trả mocToiThieuPhut, canhBaoPhut của chính sách hiện hành; chặng trong ngày có trạng thái + số người có tên (I12)", async () => {
  const w = setup();
  await don(w, { ngay: inDays(2), gio: "06:30", soNguoi: 3, ten: 2 });
  const r = await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as: SALES });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.mocToiThieuPhut, 360);
  assert.equal(r.json.canhBaoPhut, 120);
  assert.equal(r.json.chang.length, 1);
  assert.deepEqual([r.json.chang[0].soNguoi, r.json.chang[0].soNguoiCoTen, r.json.chang[0].trangThai], [3, 2, "CHUA_XEP"]);
  assert.equal((await w.call("GET", "/api/van-chuyen/lich?ngay=2026-13-40", { as: SALES })).status, 400);
});

// Danh sách trắng khoá của chặng trên lịch chung (ChangLichDto) — thêm khoá phải sửa ĐÚNG chỗ này, có chủ đích. `soHieuChuyenBay` (nợ nhỏ 2026-10-01,
// ADR-0055 C3: số hiệu chuyến bay không chỉ ra người) thêm để bảng điều phối hiện "✈︎ VN1553" trên thẻ chặng. Không tên, năm sinh, liên hệ, khoá nơi.
test("GET /lich: chặng có ĐÚNG các khoá trong danh sách trắng; soHieuChuyenBay = số hiệu đã lưu của chặng (null khi chưa có)", async () => {
  const w = setup();
  const d = await don(w, { ngay: inDays(2), gio: "06:30" });
  const doc = async () => (await w.call("GET", `/api/van-chuyen/lich?ngay=${inDays(2)}`, { as: SALES })).json.chang[0];
  const c0 = await doc();
  assert.deepEqual(Object.keys(c0).sort(), [
    "chieu", "chuyen", "datGap", "gioDon", "legId", "maDon", "ngayDon", "nhan", "noiDon", "noiTra", "orderId", "soDaDon", "soDaTra", "soDaXep", "soHieuChuyenBay",
    "soKhachHuy", "soNguoi", "soNguoiCoTen", "soVang", "tenDichVu", "trangThai", "trangThaiNhan",
  ]);
  assert.equal(c0.soHieuChuyenBay, null);
  w.sqlite.prepare("UPDATE ord_transfer_leg SET flight_code = 'VN1553' WHERE id = ?").run(d.legId);
  assert.equal((await doc()).soHieuChuyenBay, "VN1553");
});

test("R-P20: nhật ký chuyến có nhãn người bấm (tên hiển thị) qua hàm tiêm — gọi MỘT lần mỗi request; khung thử không tiêm → nhãn trống (null), không đoán", async () => {
  const w = setup({ demNhan: true });
  const t = (await taoChuyen(w, SALES, { xe: xe(w), taiXe: taiXe(w, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "07:00" } })).json;
  const truoc = w.soLanGoiNhan();
  const ct = await chiTiet(w, t.chuyen.id);
  assert.equal(w.soLanGoiNhan() - truoc, 1, "một lần cho cả danh sách id");
  assert.equal(ct.nhatKy[0].nguoiBam, `Nhãn ${SALES.slice(0, 4)}`);
  assert.doesNotMatch(JSON.stringify(ct.nhatKy), /0900000001/, "không SĐT người bấm");
  // Ghim khoá DTO (điều kiện 3 của R-P20): mỗi dòng nhật ký đúng bộ khoá này; nguoiBam là CHUỖI (tên), không đối tượng; không khoá SĐT / email / id người.
  for (const d of ct.nhatKy) {
    assert.deepEqual(Object.keys(d).sort(), ["gioGhiNhan", "gioXayRa", "id", "loai", "may", "nguoiBam", "nhan", "phaLe", "soNguoi", "vanPhongKhai"]);
    assert.ok(d.nguoiBam === null || typeof d.nguoiBam === "string");
  }
  assert.doesNotMatch(JSON.stringify(ct), /"(sdt|soDienThoai|phone|email|staffId|createdBy|nguoiId)"\s*:/i, "chi tiết chuyến không có khoá SĐT / email / id người bấm");
  const w2 = setup({ khongTiemNhan: true });
  const t2 = (await taoChuyen(w2, SALES, { xe: xe(w2), taiXe: taiXe(w2, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "07:00" } })).json;
  assert.equal((await chiTiet(w2, t2.chuyen.id)).nhatKy[0].nguoiBam, null);
  const w3 = setup();
  const t3 = (await taoChuyen(w3, SALES, { xe: xe(w3), taiXe: taiXe(w3, "Tài Xế An"), batDau: { ngay: inDays(2), gio: "07:00" } })).json;
  assert.equal((await chiTiet(w3, t3.chuyen.id)).nhatKy[0].nguoiBam, "An", "gốc lắp ráp THẬT tiêm nhãn từ staff");
});

test("lệnh lặp (LC-11): gửi LẠI cùng requestId tạo chuyến → 200 cùng chuyến, không chuyến / sự kiện / nhật ký mới", async () => {
  const w = setup();
  const x = xe(w);
  const tx = taiXe(w, "Tài Xế An");
  const body = { requestId: uuid(), xeId: x, taiXePartyId: tx, batDau: { ngay: inDays(2), gio: "07:00" }, ketThuc: { ngay: inDays(2), gio: "09:00" } };
  const a = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body });
  const b = await w.call("POST", "/api/van-chuyen/chuyen", { as: SALES, body });
  assert.equal(a.status, 201, a.text);
  assert.equal(b.status, 200, b.text);
  assert.equal(b.json.chuyen.id, a.json.chuyen.id);
  assert.equal(w.q("SELECT count(*) n FROM vc_trip")[0].n, 1);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'trip_created'")[0].n, 1);
});

test("TC-34 (I17, bài tĩnh): nơi DUY NHẤT ghi nhật ký chuyến (`nhatKy` của dieu-phoi.ts) không truyền orderId — hành động trip_* không bao giờ vào lịch sử đơn", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./dieu-phoi.ts", import.meta.url), "utf8");
  const than = src.slice(src.indexOf("const nhatKy = "), src.indexOf("/** Sự kiện KẾ HOẠCH"));
  assert.ok(than.includes("auditStatement("), "chống bài rỗng: tìm thấy thân nhatKy");
  assert.doesNotMatch(than, /orderId/);
  assert.equal((src.match(/auditStatement\(/g) ?? []).length, 1, "chỉ một nơi gọi auditStatement trong dieu-phoi.ts");
});
