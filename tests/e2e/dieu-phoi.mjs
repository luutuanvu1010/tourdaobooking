// Điều phối xe lượt 1 — VĂN PHÒNG (ADR-0049 D1–D3; ADR-0050 VK1-A, VK1-B; kế hoạch Task A13 + A15; TC-29, TC-47, TC-51) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) tạo chuyến → xếp 2 chặng → GET chi tiết GIỮ "thiếu tên" (văn phòng xử lý) → nhập tên ở đơn → hết giữ;
//   (2) TC-51: sửa nơi đón của chặng sau khi xếp → giữ NOI_HEN_DOI → "cập nhật điểm theo đơn" → suất cũ đóng STOP_CHANGED, suất mới ở điểm mới, điểm cũ SKIPPED;
//   (2b) R-P29 (chủ lần 16): bỏ một khách ĐÃ gắn tên của A + thêm người mới → màn và lệnh xuất bến CÙNG giữ KHACH_DA_DOI → "cập nhật khách theo đơn" → hết giữ;
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
const TAO_TK = await session(ACCOUNTS.superAdmin); // ADR-0071: chỉ Hành chính nhân sự / Toàn quyền tạo tài khoản (Quản trị không còn)
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
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Điều Phối E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
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
// Cảnh báo sớm lúc xếp (lời chủ 1/10 — chỉ nhắc, không chặn): B thiếu 1 tên → `canhBaoXep` THIEU_TEN đúng mã đơn B; A đủ tên, có nơi trả → không cảnh báo.
assert.deepEqual((r.body.canhBaoXep ?? []).map((x) => `${x.ma}:${x.loiNhan}`), [`THIEU_TEN:Chưa đủ tên khách: ${b.orderCode} thiếu 1 tên`], JSON.stringify(r.body.canhBaoXep));
assert.doesNotMatch(JSON.stringify(r.body.canhBaoXep), /Khách Điều Phối/, "cảnh báo không mang tên khách");
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

// --- (2b) R-P29: khách của A đổi SAU khi máy gắn tên lúc xếp (I19a) → giữ KHACH_DA_DOI ở cả màn lẫn lệnh → cập nhật khách theo đơn ---
ds = (await call(SALES, "GET", `/api/orders/${a.id}/passengers`)).body;
const boKhoa = ds.passengers.find((x) => x.fullName === P(1).fullName).personKey;
r = await call(SALES, "POST", `/api/orders/${a.id}/passengers`, { expectedUpdatedAt: ds.orderUpdatedAt, them: [P(5)], sua: [], huy: [boKhoa] });
assert.equal(r.status, 200, JSON.stringify(r.body));
r = await call(SALES, "GET", `/api/van-chuyen/chuyen/${tripId}`);
assert.deepEqual(r.body.chuyen.lyDoGiu.map((l) => l.ma), ["KHACH_DA_DOI"], JSON.stringify(r.body.chuyen.lyDoGiu));
const phienBanGiu = r.body.chuyen.version;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lyDo.map((l) => l.ma)], ["chua_du_dieu_kien_xuat_ben", ["KHACH_DA_DOI"]], "màn và lệnh CÙNG kết luận");
assert.equal((await call(ACC, "POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-khach`, { version: phienBanGiu, requestId: uuid() })).status, 403, "Kế toán không cập nhật");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripId}/cap-nhat-khach`, { version: phienBanGiu, requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.daCapNhat, 1);
assert.ok(!r.body.chuyen.lyDoGiu.some((l) => l.ma === "KHACH_DA_DOI"), JSON.stringify(r.body.chuyen.lyDoGiu));
assert.doesNotMatch(JSON.stringify(r.body), /Khách Điều Phối E2E/, "phản hồi không có tên khách (GA-55)");
const khoaMoi = (await call(SALES, "GET", `/api/orders/${a.id}/passengers`)).body.passengers.find((x) => x.fullName === P(5).fullName).personKey;
const moA = await sqlRows(`SELECT passenger_key AS k FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND valid_to_at IS NULL AND leg_id = '${a.services[0].legs[0].id}'`);
assert.ok(moA.some((x) => x.k === khoaMoi) && !moA.some((x) => x.k === boKhoa), "suất mở lại mang khoá người mới; không còn suất mở mang khoá đã bỏ");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND close_reason = 'PASSENGER_CHANGED'`))[0].n, 1);
const [nkKhach] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'trip_passengers_synced' AND target_id = '${tripId}'`);
assert.match(nkKhach.detail, /cập nhật khách theo đơn — .*: 1 khách/);
assert.doesNotMatch(nkKhach.detail, /Khách Điều Phối E2E|1933/, "nhật ký chỉ số");
console.log("✓ (2b) R-P29: khách đổi sau khi gắn tên → màn + lệnh xuất bến cùng giữ KHACH_DA_DOI; Kế toán 403; cập nhật khách theo đơn 200 (1 suất PASSENGER_CHANGED, mở lại khoá mới), hết giữ; không lộ tên");

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

// --- (6) ADR-0051 "Đã gọi báo" (TC-GB-12) + hai "Chưa kiểm" của ADR trên D1 LOCAL: so IS với giờ NULL trong thân trigger; hai người bấm song song ---
const SALES_B = await session(ACCOUNTS.salesB);
const xe2 = uuid();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xe2}', '79F-${duoi.slice(0, 3)}.${duoi.slice(3)}9', '79F${duoi}9', 'E2EGB${duoi}', 'E2EGB${duoi}', 'Xe gọi báo E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
const g = await donXacNhan([P(9), P(10)], `Khách sạn Gọi Báo E2E ${duoi}`);
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xe2, taiXePartyId: txParty, batDau: { ngay: D, gio: "14:00" }, ketThuc: { ngay: D, gio: "16:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const tripG = r.body.chuyen.id;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${tripG}/phan-bo`, { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: g.services[0].legs[0].id, soSuat: 2 }] });
assert.equal(r.status, 200, JSON.stringify(r.body));
const legG = g.services[0].legs[0].id;
assert.deepEqual((await sqlRows(`SELECT seq, kind, appt_time FROM vc_leg_appt_ack WHERE leg_id = '${legG}'`)).map((x) => [x.seq, x.kind, x.appt_time]), [[1, "XEP", "10:00"]]);
const doiGioG = async (gio) => {
  const l = (await call(SALES, "GET", `/api/orders/${g.id}`)).body.order.services[0].legs[0];
  const x = await call(SALES, "PUT", `/api/orders/${g.id}/legs/${l.id}`, { expectedUpdatedAt: l.updatedAt, leg: { ...leg(l.pickupPlace), pickupDate: l.pickupDate, pickupTime: gio } });
  assert.equal(x.status, 200, JSON.stringify(x.body));
};
const mucG = async (who = SALES) => (await call(who, "GET", "/api/van-chuyen/nhac-goi-khach")).body.muc.find((m) => m.legId === legG) ?? null;
await doiGioG("10:15");
let m = await mucG();
assert.deepEqual([m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio, m.gioHenDoi.baoDuoc], ["10:00", "10:15", true]);
assert.equal((await mucG(SALES_B)).gioHenDoi.baoDuoc, false, "Bán hàng khác thấy, không nút");
r = await call(SALES_B, "POST", `/api/van-chuyen/chang/${legG}/da-goi-bao`, { requestId: uuid(), phienBan: m.gioHenDoi.phienBan, gioMoi: m.gioHenDoi.moi });
assert.equal(r.status, 403, JSON.stringify(r.body));
r = await call(SALES, "POST", `/api/van-chuyen/chang/${legG}/da-goi-bao`, { requestId: uuid(), phienBan: m.gioHenDoi.phienBan, gioMoi: m.gioHenDoi.moi });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(await mucG(), null, "mục hết");
r = await call(SALES, "POST", `/api/van-chuyen/chang/${legG}/bo-danh-dau-goi-bao`, { requestId: uuid(), phienBan: r.body.daGoiBao.phienBan });
assert.equal(r.status, 200, JSON.stringify(r.body));
m = await mucG();
assert.deepEqual([m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio], ["10:00", "10:15"], "bỏ đánh dấu → mục hiện lại");
r = await call(SALES, "POST", `/api/van-chuyen/chang/${legG}/da-goi-bao`, { requestId: uuid(), phienBan: m.gioHenDoi.phienBan, gioMoi: m.gioHenDoi.moi });
assert.equal(r.status, 200, JSON.stringify(r.body));
await doiGioG("10:30");
m = await mucG();
assert.deepEqual([m.gioHenDoi.cu.gio, m.gioHenDoi.moi.gio], ["10:15", "10:30"], "đổi giờ lần nữa → mục hiện lại");
console.log("✓ (6) ADR-0051: xếp chụp mốc XEP; đổi giờ → mục; Bán hàng khác 403 (không nút); người lập bấm → hết; bỏ đánh dấu → lại; đổi tiếp → lại");

// Hai người bấm SONG SONG cùng phiên bản → đúng một 200, còn lại 409 gio_hen_vua_doi, đúng một dòng mới (TC-GB-5 trên D1 local — ADR "Chưa kiểm").
const ADMIN_S = await session(ACCOUNTS.admin);
const truoc = (await sqlRows(`SELECT count(*) AS n FROM vc_leg_appt_ack WHERE leg_id = '${legG}'`))[0].n;
const hai = await Promise.all([SALES, ADMIN_S].map((who) => call(who, "POST", `/api/van-chuyen/chang/${legG}/da-goi-bao`, { requestId: uuid(), phienBan: m.gioHenDoi.phienBan, gioMoi: m.gioHenDoi.moi })));
assert.deepEqual(hai.map((x) => x.status).sort(), [200, 409], JSON.stringify(hai.map((x) => x.body)));
// Người thua nhận 409: `gio_hen_vua_doi` (thua ở câu cổng max(seq) / UNIQUE — lớp CSDL) hoặc `khong_con_can_goi` (đọc SAU khi người kia đã ghi — lớp kiểm).
const maThua = hai.find((x) => x.status === 409).body.error.code;
assert.ok(["gio_hen_vua_doi", "khong_con_can_goi"].includes(maThua), maThua);
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_leg_appt_ack WHERE leg_id = '${legG}'`))[0].n, truoc + 1, "đúng một dòng mới");
console.log(`✓ (6b) hai người bấm song song → một 200, một 409 (${maThua}), đúng một dòng mới`);

// So IS với NULL trong thân trigger chuỗi trên D1 (ADR "Chưa kiểm"): mốc "chưa chốt giờ" → dòng đảo khôi phục đúng (giờ trước NULL IS NULL).
const [{ s: seqCuoi, t: gioCuoi }] = await sqlRows(`SELECT max(seq) AS s, (SELECT appt_time FROM vc_leg_appt_ack WHERE leg_id = '${legG}' ORDER BY seq DESC LIMIT 1) AS t FROM vc_leg_appt_ack WHERE leg_id = '${legG}'`);
await sql(`INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, updated_at)
  VALUES ('${uuid()}', '${legG}', ${seqCuoi + 1}, 'DA_GOI', '${D}', NULL, '${D}', '${gioCuoi}', '${uuid()}', '${AT}', '${AT}')`);
await sql(`INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, updated_at, bo_gio_hen_doi)
  VALUES ('${uuid()}', '${legG}', ${seqCuoi + 2}, 'BO_DANH_DAU', '${D}', '${gioCuoi}', '${D}', NULL, '${uuid()}', '${AT}', '${AT}', 'null')`);
try {
  await sql(`INSERT INTO vc_leg_appt_ack (id, leg_id, seq, kind, appt_date, appt_time, prev_appt_date, prev_appt_time, request_id, created_at, updated_at)
    VALUES ('${uuid()}', '${legG}', ${seqCuoi + 3}, 'DA_GOI', '${D}', '11:00', '${D}', NULL, '${uuid()}', '${AT}', '${AT}')`);
  assert.fail("giờ trước NULL mà dòng trước có giờ → trigger chuỗi phải chặn");
} catch (err) {
  assert.match(String(err.message ?? err), /gb_chain/);
}
console.log("✓ (6c) D1 thật: chuỗi mốc với giờ NULL ('chưa chốt giờ') — IS NULL nối đúng; lệch → gb_chain");

// --- (7) Cảnh báo sớm lúc xếp: chặng CHƯA CÓ NƠI TRẢ vẫn xếp được (200) + `canhBaoXep` CHUA_CO_NOI_TRA; gửi lại cùng requestId → 200, không tính lại cảnh báo ---
const xe3 = uuid();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xe3}', '79F-${duoi.slice(0, 3)}.${duoi.slice(3)}8', '79F${duoi}8', 'E2ECB${duoi}', 'E2ECB${duoi}', 'Xe cảnh báo E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
const kNoiTra = await call(SALES, "POST", "/api/orders", orderInput({
  services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ ...leg(`Khách sạn Cảnh Báo E2E ${duoi}`), dropoffLocationId: null, dropoffPlace: "" }] })], passengers: [P(11), P(12)],
}));
assert.equal(kNoiTra.status, 201, JSON.stringify(kNoiTra.body));
assert.equal((await call(SALES, "POST", `/api/orders/${kNoiTra.body.order.id}/status`, { status: "confirmed" })).status, 200, "xác nhận đơn thiếu nơi trả vẫn được");
r = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xe3, taiXePartyId: txParty, batDau: { ngay: D, gio: "17:00" }, ketThuc: { ngay: D, gio: "19:00" } });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xepK = { version: r.body.chuyen.version, requestId: uuid(), chang: [{ legId: kNoiTra.body.order.services[0].legs[0].id, soSuat: 2 }] };
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${r.body.chuyen.id}/phan-bo`, xepK);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual((r.body.canhBaoXep ?? []).map((x) => [x.ma, x.aiXuLyNhan.length > 0]), [["CHUA_CO_NOI_TRA", true]], JSON.stringify(r.body.canhBaoXep));
assert.equal(r.body.suat.filter((s) => s.loai === "PASSENGER").length, 2, "đã xếp 2 khách");
const lai = await call(SALES, "POST", `/api/van-chuyen/chuyen/${r.body.chuyen.id}/phan-bo`, xepK);
assert.equal(lai.status, 200, JSON.stringify(lai.body));
assert.equal(lai.body.canhBaoXep, undefined, "gửi lại cùng requestId: lô không chạy lại, không cảnh báo");
console.log("✓ (7) cảnh báo sớm lúc xếp: thiếu nơi trả → xếp được + canhBaoXep CHUA_CO_NOI_TRA; gửi lại cùng requestId → 200 không cảnh báo");
