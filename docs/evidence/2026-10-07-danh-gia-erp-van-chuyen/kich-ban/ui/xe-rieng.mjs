// Bài thử API nhỏ (người kiểm, chỉ đọc repo): yêu cầu (2) của chủ — chuyến riêng một đoàn ("Xe riêng" = exclusiveVehicle, ADR-0056 VK3-A).
// (a) đơn thường đã ở chuyến → xếp thêm đơn "xe riêng" vào CÙNG chuyến; (b) chuyến chỉ có đơn xe riêng → xếp thêm đơn thường. Ghi mã HTTP + mã lỗi + đọc lại SQLite.
// Chạy từ GỐC repo: CHROME_BIN=… OUT=<scratchpad>/ui/anh/xe-rieng node <scratchpad>/ui/xe-rieng.mjs
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ACCOUNTS, CHU, OUT, assert, dungMoiTruong, vnDate, LOC_BEN_TAU } from "../../../../../docs/evidence/2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const DO = {};
const ghi = (k, v) => { DO[k] = v; console.log(`   [${k}] ${JSON.stringify(v)}`); };
const { env, call } = await dungMoiTruong([CHU]);
const NGAY = vnDate(5);
const han = vnDate(300);
const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
try {
  const xe = await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/xe", { plateNumber: "79B-171.71", chassisNumber: "XR7917171", name: "Xe riêng thử", passengerCapacity: 15 });
  dung(xe, 201, "xe");
  for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) dung(await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/xe/${xe.json.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-XR`, expiryDate: han }), 201, typeCode);
  const tx = await call(ACCOUNTS.chu, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Xe Riêng", phone: "0900000491", roles: ["DRIVER_INTERNAL"] });
  dung(tx, 201, "tài xế");
  const [{ party_id: txParty }] = env.sql(`SELECT party_id FROM staff WHERE id = '${tx.json.staff.id}'`);
  dung(await call(ACCOUNTS.admin, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: "793000000001", classCode: "D2", expiryDate: han }), 201, "GPLX");
  let n = 0;
  const don = async (gio, noi, so, xeRieng) => {
    const r = await call(ACCOUNTS.salesA, "POST", "/api/orders", {
      customerName: `Khách Xe Riêng ${++n}`, customerPhone: `0903 300 ${400 + n}`, customerEmail: "", customerNote: "", discount: 0, depositAmount: 0, depositMethod: null, paymentNote: "",
      services: [{ kind: "catalog", pickupChoice: "DON", catalogCode: "TD101", pax: { adult: so, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 1350000 }, departTime: "", pickupTime: "", pickupPlace: "", checkinDate: "", checkinTime: "", checkinPlace: "", note: "", departDate: NGAY,
        legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: noi, dropoffLocationId: LOC_BEN_TAU, dropoffPlace: "", exclusiveVehicle: xeRieng, minVehicleSeats: null }] }],
      passengers: Array.from({ length: so }, (_, j) => ({ fullName: `Khách XR ${n}-${j + 1}`, birthYear: 1990, paxCode: null })),
    });
    dung(r, 201, `đơn ${noi}`);
    const c = await call(ACCOUNTS.admin, "POST", `/api/orders/${r.json.order.id}/status`, { status: "confirmed" });
    dung(c, 200, "xác nhận");
    const leg = c.json.order.services[0].legs[0];
    return { legId: leg.id, xeRieng: leg.exclusiveVehicle };
  };
  const THUONG = await don("08:00", "Novotel, 50 Trần Phú", 3, false);
  const RIENG = await don("08:10", "Vinpearl Condotel, 78 Trần Phú", 4, true);
  const THUONG2 = await don("08:20", "Liberty Central, 9 Biệt Thự", 2, false);
  ghi("chang", { THUONG: THUONG.xeRieng, RIENG: RIENG.xeRieng });
  const chuyen = async (tu, den) => (await call(ACCOUNTS.admin, "POST", "/api/van-chuyen/chuyen", { requestId: randomUUID(), xeId: xe.json.vehicle.id, taiXePartyId: txParty, batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: NGAY, gio: den } })).json.chuyen;
  const xep = async (t, legId, so) => {
    const v = (await call(ACCOUNTS.admin, "GET", `/api/van-chuyen/chuyen/${t.id}`)).json.chuyen.version;
    const r = await call(ACCOUNTS.admin, "POST", `/api/van-chuyen/chuyen/${t.id}/phan-bo`, { version: v, requestId: randomUUID(), chang: [{ legId, soSuat: so }] });
    return { status: r.status, code: r.json?.error?.code ?? null, message: r.json?.error?.message ?? null };
  };
  const A = await chuyen("07:30", "09:30");
  ghi("a1_xepThuong", await xep(A, THUONG.legId, 3));
  ghi("a2_xepRiengVaoChuyenCoKhachKhac", await xep(A, RIENG.legId, 4));
  const B = await chuyen("10:30", "12:30");
  ghi("b1_xepRiengVaoChuyenTrong", await xep(B, RIENG.legId, 4));
  ghi("b2_xepThuongVaoChuyenXeRieng", await xep(B, THUONG2.legId, 2));
  ghi("SQL", env.sql(`SELECT t.code, count(a.id) AS suat FROM vc_trip t LEFT JOIN vc_trip_allocation a ON a.trip_id = t.id AND a.valid_to_at IS NULL AND a.status = 'WAITING' GROUP BY t.code ORDER BY t.code`));
} finally {
  writeFileSync(join(OUT, "xe-rieng-do.json"), JSON.stringify(DO, null, 2));
  await env.stop();
}
