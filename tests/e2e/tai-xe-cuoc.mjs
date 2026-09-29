// "Cuốc của tôi" + lệnh tiến độ của TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.2, 1.7 route 19–29, 1.8; TC-36, TC-38, TC-39; ruling R-P17 — Task A15) trên API THẬT
// (wrangler dev, D1 local tạm), tài khoản tài xế công ty thật (đăng nhập bằng PIN): danh sách chỉ chuyến mình lái (không tên, không SĐT); chi tiết ngoài ngày
// chạy không tên / liên hệ, sau xuất bến (đang chạy) có; tài xế khác / Bán hàng gọi route tài xế cho chuyến không lái → 404; tài khoản chỉ-DRIVER_PARTNER gọi
// MỌI route tài xế → 403; `xayRaLuc` → 400 `xay_ra_khong_nhan`; "đã đón" hai lần cùng requestId → một sự kiện. Dữ liệu độc nhất theo lần chạy. Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(2);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

const taiKhoan = async (roles) => {
  const x = await call(ADMIN, "POST", "/api/staff", { fullName: `Cuốc E2E ${roles.join(" ")} ${duoi}`, phone: randomPhone(), roles });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  const lg = await login(x.body.staff.phone, x.body.pin);
  assert.equal(lg.status, 200, JSON.stringify(lg.body));
  const [{ party_id }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${x.body.staff.id}'`);
  return { cookie: lg.cookie, party: party_id };
};
const TX = await taiKhoan(["DRIVER_INTERNAL"]);
const TX2 = await taiKhoan(["DRIVER_INTERNAL"]);
const TXDT = await taiKhoan(["DRIVER_EXTERNAL"]);
for (const t of [TX, TX2]) {
  r = await call(ADMIN, "POST", `/api/parties/${t.party}/documents`, { typeCode: "GPLX", number: `78${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 10)}`, classCode: "D1", expiryDate: vnDate(400) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
}
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xe = async (hau) => {
  const id = uuid();
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79G-${duoi.slice(0, 3)}.${duoi.slice(3)}${hau}', '79G${duoi}${hau}', 'E2ECUOC${duoi}${hau}', 'E2ECUOC${duoi}${hau}', 'Xe cuốc E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
};
const chuyen = async (taiXe, hau) => {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Cuốc E2E", customerPhone: "0913579246",
    services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Khách sạn Cuốc E2E ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
    passengers: [{ fullName: "Khách Cuốc E2E 1", birthYear: 1944, paxCode: null }, { fullName: "Khách Cuốc E2E 2", birthYear: 1945, paxCode: null }],
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
  let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: await xe(hau), taiXePartyId: taiXe.party, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  c = await call(SALES, "POST", `/api/van-chuyen/chuyen/${c.body.chuyen.id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: [{ legId: o.body.order.services[0].legs[0].id, soSuat: 2 }] });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  return c.body;
};
const a = await chuyen(TX, "A");
const b = await chuyen(TX2, "B");
const id = a.chuyen.id;

// --- 1. Route 19 / 20: chỉ chuyến mình lái; ngoài ngày chạy không tên / liên hệ ---
r = await call(TX.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi?tu=${vnDate(0)}&den=${vnDate(3)}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.chuyen.map((c) => c.id), [id]);
assert.doesNotMatch(JSON.stringify(r.body), /Khách Cuốc|0913579246|Liên Hệ Cuốc/);
r = await call(TX.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`);
assert.equal(r.status, 200);
assert.equal(r.body.trongNgayChay, false);
assert.equal("lienHe" in r.body, false);
assert.ok(r.body.suat.every((s) => !("hoTen" in s)));
for (const [who, ten] of [[TX2.cookie, "tài xế khác"], [SALES, "Bán hàng"]]) assert.equal((await call(who, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`)).status, 404, ten);
console.log("✓ route 19 / 20: chỉ chuyến mình lái; ngoài ngày chạy không tên, không liên hệ; tài xế khác / Bán hàng → 404");

// --- 2. Tài khoản chỉ-DRIVER_PARTNER → 403 ở MỌI route tài xế ---
const DUOI = ["xuat-ben", "diem/x/da-toi", "phan-bo/x/don", "phan-bo/x/vang", "phan-bo/x/khach-huy", "phan-bo/x/tra", "ket-thuc", "ket-thuc-gian-doan", "thu-tu"];
assert.equal((await call(TXDT.cookie, "GET", "/api/van-chuyen/cuoc-cua-toi")).status, 403);
assert.equal((await call(TXDT.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`)).status, 403);
for (const d of DUOI) assert.equal((await call(TXDT.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/${d}`, { requestId: uuid() })).status, 403, d);
console.log("✓ tài xế đối tác: 403 ở cả 11 route tài xế");

// --- 3. Lệnh tiến độ của tài xế ---
r = await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid(), xayRaLuc: new Date().toISOString() });
assert.deepEqual([r.status, r.body.error.code], [400, "xay_ra_khong_nhan"]);
r = await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
assert.equal(r.body.trongNgayChay, true, "đang chạy → trong ngày chạy");
const [e] = await sqlRows(`SELECT occurred_source, occurred_at, created_at FROM vc_trip_event WHERE trip_id = '${id}' AND kind = 'DEPARTED'`);
assert.deepEqual([e.occurred_source, e.occurred_at], ["MAY_CHU", e.created_at]);
r = await call(TX.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`);
assert.deepEqual(r.body.suat.map((s) => s.hoTen).sort(), ["Khách Cuốc E2E 1", "Khách Cuốc E2E 2"]);
assert.deepEqual(r.body.lienHe.map((x) => [x.tenLienHe, x.sdtLienHe]), [["Liên Hệ Cuốc E2E", "0913579246"]]);
const diemDon = r.body.diem.find((d) => d.loai === "PICKUP").id;
assert.equal((await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/diem/${diemDon}/da-toi`, { requestId: uuid() })).status, 200);
const rid = uuid();
for (let i = 0; i < 2; i++) assert.equal((await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${r.body.suat[0].id}/don`, { requestId: rid })).status, 200);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = '${id}' AND kind = 'PASSENGER_BOARDED'`))[0].n, 1, "cùng requestId → MỘT sự kiện");
assert.equal((await call(TX2.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/phan-bo/${r.body.suat[1].id}/don`, { requestId: uuid() })).status, 404, "tài xế khác không bấm được");
r = await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "ENDED_INTERRUPTED");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE target_id = '${id}' AND action LIKE 'trip_%' AND order_id IS NOT NULL`))[0].n, 0, "nhật ký chuyến không mang order_id");
void b;
console.log("✓ lệnh tài xế: xayRaLuc → 400; xuất bến MAY_CHU; sau xuất bến có tên + liên hệ; đã tới; 'đã đón' lặp cùng requestId → một sự kiện; tài xế khác 404; kết thúc gián đoạn");
