// Điều phối xe lượt 1 — VĂN PHÒNG (ADR-0049 D1–D3; ADR-0050 VK1-A, VK1-B; kế hoạch Task A13 + A15; TC-29, TC-47, TC-51) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) tạo chuyến → xếp 2 chặng → GET chi tiết GIỮ "thiếu tên" (văn phòng xử lý) → nhập tên ở đơn → hết giữ;
//   (2) TC-51: sửa nơi đón của chặng sau khi xếp → giữ NOI_HEN_DOI → "cập nhật điểm theo đơn" → suất cũ đóng STOP_CHANGED, suất mới ở điểm mới, điểm cũ SKIPPED;
//   (3) TC-29: Bán hàng BẤM THAY xuất bến → 200; có bản chụp ĐẠT + dòng con, bản chốt trỏ đúng dòng `ord_passenger`, suất đã gắn tên (I19b);
//   (4) TC-47 trên D1: khai giờ "đã tới" lùi 5 phút → sự kiện VAN_PHONG_KHAI, giờ xảy ra = giờ khai (đúng khuôn toISOString), có chính sách; khai ngoài kẹp →
//       409 gio_xay_ra_ngoai_khoang kèm giờ sớm nhất; Kế toán → 403;
//   (5) lớp CSDL trên D1 thật: giờ xảy ra MÁY CHỦ khác giờ ghi nhận → CHECK chặn; sửa sự kiện → trigger chặn.
// Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số theo Date.now()). Chuyến chạy NGÀY KIA (xếp không vướng mốc 6 giờ); xuất bến sớm là hợp lệ.
// Tên khách, số giấy tờ là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(2);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const P = (n) => ({ fullName: `Khách Điều Phối E2E ${n}`, birthYear: 1933, paxCode: null });
const leg = (noi) => ({ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: noi, dropoffLocationId: LOC, dropoffPlace: "" });
let r;

// --- Nền: tài xế công ty (tài khoản thật, vai DRIVER_INTERNAL + GPLX D1), xe 15 chỗ có Kiểm định + Bảo hiểm ---
r = await call(ADMIN, "POST", "/api/staff", { fullName: "Tài Xế Điều Phối E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xeId = uuid();
const bien = `79F-${duoi.slice(0, 3)}.${duoi.slice(3)}`;
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const AT = new Date().toISOString();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '${bien}', '79F${duoi}', 'E2EDP${duoi}', 'E2EDP${duoi}', 'Xe điều phối E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}

// --- (1) Hai đơn đã xác nhận: A đủ tên (2/2), B thiếu tên (1/2) ---
const donXacNhan = async (ten, noi) => {
  const x = await call(SALES, "POST", "/api/orders", orderInput({ services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [leg(noi)] })], passengers: ten }));
  assert.equal(x.status, 201, JSON.stringify(x.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${x.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return x.body.order;
};
const a = await donXacNhan([P(1), P(2)], `Khách sạn Điều Phối E2E ${duoi}`);
const b = await donXacNhan([P(3)], `Khách sạn Điều Phối E2E ${duoi}`);
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: txParty, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripId = r.body.chuyen.id;
const ma = r.body.chuyen.ma;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, {
  version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: a.services[0].legs[0].id, soSuat: 2 }, { legId: b.services[0].legs[0].id, soSuat: 2 }],
});
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok(r.body.chuyen.lyDoGiu.some((l) => l.ma === "THIEU_TEN" && l.aiXuLy === "VAN_PHONG"), JSON.stringify(r.body.chuyen.lyDoGiu));
assert.equal((await call(ACC, "GET", `/api/van-chuyen/chuyen/${tripId}`)).status, 200, "Kế toán xem chi tiết");
let ds = (await call(SALES, "GET", `/api/orders/${b.id}/passengers`)).body;
r = await call(SALES, "POST", `/api/orders/${b.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [P(4)], sua: [], huy: [] });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`);
assert.ok(!r.body.chuyen.lyDoGiu.some((l) => l.ma === "THIEU_TEN"), "nhập đủ tên ở đơn → hết giữ");
console.log(`✓ (1) ${ma}: xếp 2 chặng, giữ "thiếu tên — văn phòng"; nhập tên ở đơn → hết giữ`);

// --- (2) TC-51: nơi đón của A đổi sau khi xếp → giữ NOI_HEN_DOI → cập nhật điểm theo đơn ---
const la = (await call(SALES, "GET", `/api/orders/${a.id}`)).body.order.services[0].legs[0];
r = await call(SALES, "PUT", `/api/orders/${a.id}/legs/${la.id}`, { expectedUpdatedAt: la.updatedAt, leg: { ...leg(`Khách sạn Mới E2E ${duoi}`), pickupDate: la.pickupDate } });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`);
assert.ok(r.body.chuyen.lyDoGiu.some((l) => l.ma === "NOI_HEN_DOI"), JSON.stringify(r.body.chuyen.lyDoGiu));
assert.doesNotMatch(JSON.stringify(r.body), /\b[LT]:[0-9a-f-]{8,}/, "không lộ khoá so sánh nơi");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-diem`, { version: r.body.chuyen.version, requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.daCapNhat, 2);
assert.ok(!r.body.chuyen.lyDoGiu.some((l) => l.ma === "NOI_HEN_DOI"));
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND close_reason = 'STOP_CHANGED'`))[0].n, 2);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_stop WHERE trip_id = '${tripId}' AND status = 'SKIPPED' AND skip_reason_code = 'BO_QUA_KHONG_CON_KHACH'`))[0].n, 0, "điểm cũ còn khách của B");
console.log("✓ (2) TC-51: giữ NOI_HEN_DOI → cập nhật điểm theo đơn 200 (2 suất đóng STOP_CHANGED + mở lại), hết giữ; không lộ khoá nơi");

// --- (3) TC-29: Bán hàng bấm thay xuất bến ---
assert.equal((await call(ACC, "POST", `/api/van-chuyen/chuyen/${tripId}/xuat-ben`, { requestId: uuid() })).status, 403, "Kế toán không bấm thay");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
const [chup] = await sqlRows(`SELECT id, ket_qua, cmd_id FROM vc_trip_departure_check WHERE trip_id = '${tripId}'`);
assert.equal(chup.ket_qua, "DAT");
const [{ last_cmd_id: cmd }] = await sqlRows(`SELECT last_cmd_id FROM vc_trip WHERE id = '${tripId}'`);
assert.equal(chup.cmd_id, cmd, "bản chụp mang dấu lệnh của lô xuất bến (LC-05)");
assert.ok((await sqlRows(`SELECT count(*) AS n FROM vc_trip_departure_check_item WHERE check_id = '${chup.id}'`))[0].n >= 3);
const chot = await sqlRows(`SELECT m.passenger_row_id, a.passenger_key, p.person_key, p.order_id FROM vc_trip_manifest m JOIN vc_trip_allocation a ON a.id = m.allocation_id
  JOIN ord_passenger p ON p.id = m.passenger_row_id WHERE m.trip_id = '${tripId}'`);
assert.equal(chot.length, 4);
for (const c of chot) assert.equal(c.person_key, c.passenger_key, "bản chốt trỏ đúng dòng của người trên suất");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND valid_to_at IS NULL AND passenger_key IS NULL`))[0].n, 0, "I19b: mọi suất đã gắn tên");
const [nk] = await sqlRows(`SELECT order_id, detail FROM audit_log WHERE action = 'trip_departed' AND target_id = '${tripId}'`);
assert.equal(nk.order_id, null);
assert.match(nk.detail, /xuất bến · xe .* · 4 khách · văn phòng bấm thay/);
console.log("✓ (3) TC-29: bấm thay xuất bến 200; bản chụp ĐẠT (dấu lệnh), bản chốt 4 dòng trỏ đúng người, suất đã gắn tên; nhật ký 'văn phòng bấm thay'");

// --- (4) TC-47 trên D1: khai giờ "đã tới" ---
const ct = (await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`)).body;
const diemDon = ct.diem.filter((d) => d.loai === "PICKUP" && d.trangThai === "PENDING").sort((x, y) => x.thuTu - y.thuTu)[0];
assert.ok("daToi" in ct.gioSomNhatKhai.diem.find((d) => d.id === diemDon.id), "R-P14: ô giờ sớm nhất cho điểm chưa tới (null khi xe vừa xuất bến trong phút này — không phút chẵn nào hợp lệ; bài harness bam-thay.test.ts kiểm giá trị)");
// Giờ khai = ngay sau giờ xuất bến (đã ghi) — lùi so với lúc bấm, trong kẹp, đúng thứ tự (không phụ thuộc giờ chạy bài).
const [{ departed_ms: xb }] = await sqlRows(`SELECT departed_ms FROM vc_trip WHERE id = '${tripId}'`);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/diem/${diemDon.id}/da-toi`, { requestId: uuid(), xayRaLuc: new Date(xb + 1).toISOString() });
assert.equal(r.status, 200, JSON.stringify(r.body));
const [e] = await sqlRows(`SELECT occurred_at, occurred_ms, occurred_source, created_at, policy_id FROM vc_trip_event WHERE trip_id = '${tripId}' AND kind = 'STOP_ARRIVED'`);
assert.equal(e.occurred_source, "VAN_PHONG_KHAI");
assert.equal(e.occurred_at, new Date(e.occurred_ms).toISOString(), "đúng khuôn toISOString (I33)");
assert.ok(e.occurred_at <= e.created_at && e.policy_id);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo/${ct.suat.find((x) => x.diemLen === diemDon.id).id}/vang`, { requestId: uuid(), xayRaLuc: `${vnDate(-1)}T08:00:00+07:00` });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "gio_xay_ra_ngoai_khoang");
assert.ok(r.body.error.maGio.includes("LUI_QUA_KEP") && "somNhat" in r.body.error, JSON.stringify(r.body)); // somNhat có thể null: xe vừa tới trong phút này
console.log("✓ (4) TC-47: khai giờ 'đã tới' → VAN_PHONG_KHAI (đúng khuôn, có chính sách); khai lùi quá kẹp → 409 kèm giờ sớm nhất");

// --- (5) Lớp CSDL trên D1 thật ---
const thu = async (q, re) => {
  try {
    await sql(q);
    assert.fail(`CSDL phải chặn: ${q.slice(0, 80)}`);
  } catch (err) {
    assert.match(String(err.message ?? err), re);
  }
};
await thu(`INSERT INTO vc_trip_event (id, trip_id, kind, request_id, decided_mode, occurred_at, occurred_ms, occurred_source, created_at, updated_at)
  VALUES ('${uuid()}', '${tripId}', 'STOP_ARRIVED', '${uuid()}', 'NGUOI', '${new Date(Date.now() - 60_000).toISOString()}', ${Date.now()}, 'MAY_CHU', '${new Date().toISOString()}', '${new Date().toISOString()}')`, /CHECK constraint failed|constraint/i);
await thu(`UPDATE vc_trip_event SET count = 99 WHERE trip_id = '${tripId}'`, /lc04|append|không sửa|no_update|ABORT|constraint/i);
console.log("✓ (5) D1 thật: sự kiện MAY_CHU lệch giờ ghi nhận → CHECK chặn; sửa sự kiện → trigger chặn");
