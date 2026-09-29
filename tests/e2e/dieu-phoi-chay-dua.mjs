// BÀI CHẠY ĐUA xếp khách (ADR-0049 D1; kế hoạch TC-33 — Task A14) trên API THẬT (wrangler dev, D1 local tạm): 10 yêu cầu SONG SONG, mỗi yêu cầu xếp MỘT chặng
// 1 người vào CÙNG chuyến xe 3 chỗ; máy khách thử lại khi gặp 409 `stale` (đọc lại version). Kết quả: ĐÚNG 3 thành công, 7 × 409 `vuot_so_cho`, số suất mở
// KHÔNG BAO GIỜ vượt số chỗ.
// P16 ba lớp (bản sao cục bộ, không commit — nhật ký thi công §10.18): (i) tạm bỏ vế version ở câu cổng, giữ trigger → vẫn ≤ 3; (ii) `CHAY_DUA_BO_TRIGGER=1`
// xoá trigger sức chứa trên D1 local, giữ cổng → vẫn ≤ 3; (iii) bỏ cả hai → VƯỢT (đỏ). Khi chạy P16 đặt `CHAY_DUA_P16=1`: chỉ khẳng định "không vượt số chỗ"
// (mã lỗi có thể là `trip_rule` của lớp CSDL thay vì `vuot_so_cho` của lớp route). "D1 production chạy lô lần lượt" vẫn CHƯA KIỂM (ADR "Chưa kiểm").
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(3);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P16 = process.env.CHAY_DUA_P16 === "1";
const SO_CHO = 3;
const SO_YEU_CAU = 10;

if (process.env.CHAY_DUA_BO_TRIGGER === "1") {
  await sql("DROP TRIGGER IF EXISTS vc_trip_allocation_capacity_ins");
  console.log("(P16 lớp ii) đã xoá trigger sức chứa trên D1 local tạm");
}

// Nền: tài xế công ty, xe 3 chỗ, 10 đơn một khách đã xác nhận (ngày kìa — xếp không vướng mốc 6 giờ).
let r = await call(ADMIN, "POST", "/api/staff", { fullName: `Tài Xế Chạy Đua ${duoi}`, phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: tx }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${tx}/documents`, { typeCode: "GPLX", number: `77${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xeId = uuid();
const AT = new Date().toISOString();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '79H-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79H${duoi}', 'E2EDUA${duoi}', 'E2EDUA${duoi}', 'Xe chạy đua', 2021, ${SO_CHO}, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
const chang = [];
for (let i = 0; i < SO_YEU_CAU; i++) {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    services: [catalogService({ pax: { adult: 1 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Khách sạn Chạy Đua ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
  chang.push(o.body.order.services[0].legs[0].id);
}
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: tx, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripId = r.body.chuyen.id;

// Đua: mỗi "máy khách" đọc version, gửi xếp; 409 stale → đọc lại, thử lại (tối đa 40 lần).
const mayKhach = async (legId) => {
  for (let lan = 0; lan < 40; lan++) {
    const v = (await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`)).body.chuyen.version;
    const x = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { version: v, requestId: uuid(), chang: [{ legId, soSuat: 1 }] });
    if (x.status === 409 && x.body.error.code === "stale") continue;
    return { status: x.status, code: x.body?.error?.code ?? null, lan };
  }
  return { status: 0, code: "het_lan_thu", lan: 40 };
};
const kq = await Promise.all(chang.map(mayKhach));
const [{ n: mo }] = await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND valid_to_at IS NULL AND status IN ('WAITING', 'BOARDED')`);
const thanhCong = kq.filter((k) => k.status === 200).length;
console.log(`kết quả: ${thanhCong} × 200; mã khác: ${JSON.stringify(kq.filter((k) => k.status !== 200).map((k) => `${k.status} ${k.code}`))}; suất mở ${mo}/${SO_CHO}; lần thử lại tối đa ${Math.max(...kq.map((k) => k.lan))}`);
assert.ok(mo <= SO_CHO, `số suất mở ${mo} VƯỢT số chỗ ${SO_CHO}`);
assert.equal(thanhCong, mo, "mỗi yêu cầu thành công mở đúng một suất");
if (!P16) {
  assert.equal(thanhCong, SO_CHO, "đúng 3 thành công");
  assert.deepEqual(kq.filter((k) => k.status !== 200).map((k) => `${k.status} ${k.code}`), Array(SO_YEU_CAU - SO_CHO).fill("409 vuot_so_cho"));
}
console.log(`✓ TC-33: ${SO_YEU_CAU} yêu cầu song song vào chuyến ${SO_CHO} chỗ → ${thanhCong} thành công, không vượt số chỗ`);
