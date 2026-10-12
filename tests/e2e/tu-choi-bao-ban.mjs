// Tài xế đối tác Từ chối chuyến + Báo bận (ADR-0053 D7–D9; kế hoạch A4 T12 — NT-4, NT-7, NT-8, NT-11, NT-14) trên API THẬT (wrangler dev, D1 local tạm):
// tài khoản Tài xế đối tác (vai DRIVER_EXTERNAL → quyền DRIVER_PARTNER) lái xe của nhà xe đối tác; văn phòng (Quản trị, Kế toán, Toàn quyền), tài xế công ty,
// tài xế đối tác thứ hai là các bên còn lại. Giờ gieo TƯƠNG ĐỐI giờ thật (trigger B8.3 so giờ CSDL = giờ thật; đường Từ chối thành công không dùng đồng hồ giả).
// NT-4: Từ chối trước hạn 200 (dòng lái REFUSED, người đóng = chính mình, MỘT dòng nhật ký không tên), lệnh lặp cùng requestId 200, người khác dùng lại → không 200,
// lý do sai 400, tài xế công ty 403, Toàn quyền không lái 403, tài xế đối tác khác 404, QUÁ HẠN 409 refuse_deadline_passed. NT-7: chuyến giữ CHUA_CO_TAI_XE, tin chỉ tới
// người có trip.dispatch, Chi tiết chuyến: lý do chỉ người có trip.dispatch (Kế toán không). NT-8: Báo bận — 409 khi chồng chuyến mình đang được xếp (chỉ chuyến của mình),
// 201 + Location, văn phòng xếp tài xế vào khung bận → 409 câu không lý do, SQL gõ tay bị trigger chặn, dải văn phòng không lý do, rút một lần. NT-11: cổng. NT-14: tin
// chuyến tới tài xế đối tác đang lái (không mã đơn). Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số theo Date.now()). Tên, số GIẢ.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, login, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const KT = await session(ACCOUNTS.accountant);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const duoi = String(Date.now()).slice(-6);
const uuid = () => randomUUID();
const AT = new Date().toISOString();
const LOC_TEN = /TD-\d{8}-\d{4,}|Khách|\d{8,}/; // mã đơn, tên khách, chuỗi số dài — không bao giờ ở tin / câu 409

const taoTheoVai = async (roles, ten) => {
  const x = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `${ten} ${duoi}`, phone: randomPhone(), roles });
  assert.equal(x.status, 201, JSON.stringify(x.body));
  const lg = await login(x.body.staff.phone, x.body.pin);
  assert.equal(lg.status, 200, JSON.stringify(lg.body));
  const [{ party_id }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${x.body.staff.id}'`);
  return { cookie: lg.cookie, party: party_id, id: x.body.staff.id, ten: `${ten} ${duoi}` };
};
const gplx = async (party, so) => {
  const r = await call(ADMIN, "POST", `/api/parties/${party}/documents`, { typeCode: "GPLX", number: so, classCode: "D2", expiryDate: vnDate(400) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
};
/** Giờ treo tường VN ({ngay, gio}) của một mốc ms. */
const vn = (ms) => {
  const s = new Date(Math.floor(ms / 60_000) * 60_000 + 7 * 3600_000).toISOString();
  return { ngay: s.slice(0, 10), gio: s.slice(11, 16) };
};
const vnMs = (ngay, gio) => Date.parse(`${ngay}T${gio}:00+07:00`);
const tin = async (cookie) => (await call(cookie, "GET", "/api/thong-bao?ngan=cua-toi")).body.tin.filter((t) => t.loai === "chuyen");

// --- Dữ liệu: nhà xe + hai tài xế đối tác (Tài xế của nhà xe, GPLX D2) + xe 15 chỗ của nhà xe + tài xế công ty ---
const nx = await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Nhà Xe Từ Chối E2E ${duoi}` });
assert.equal(nx.status, 201, JSON.stringify(nx.body));
const nhaXe = nx.body.party.id;
assert.equal((await call(ADMIN, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" })).status, 201);
const TX = await taoTheoVai(["DRIVER_EXTERNAL"], "Tài Xế Đối Tác Một");
const TX2 = await taoTheoVai(["DRIVER_EXTERNAL"], "Tài Xế Đối Tác Hai");
const TXC = await taoTheoVai(["DRIVER_INTERNAL"], "Tài Xế Công Ty");
for (const [t, so] of [[TX, "1"], [TX2, "2"], [TXC, "3"]]) await gplx(t.party, `7955${duoi}${so}0`);
for (const t of [TX, TX2]) {
  const q = await call(ADMIN, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: t.party, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" });
  assert.equal(q.status, 201, JSON.stringify(q.body));
}
const xe = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: `79K-${duoi.slice(0, 3)}.${duoi.slice(3)}`, chassisNumber: `E2ETUCHOI${duoi}`, name: "Xe Từ Chối E2E", passengerCapacity: 15, ownerPartyId: nhaXe });
assert.equal(xe.status, 201, JSON.stringify(xe.body));
const xeId = xe.body.vehicle.id;
const tao = async (tx, bd, kt) => {
  const r = await call(ADMIN, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: tx.party, batDau: bd, ketThuc: kt });
  return r;
};
const taoOk = async (tx, bd, kt) => {
  const r = await tao(tx, bd, kt);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body.chuyen;
};
const D2 = vnDate(2);
const D3 = vnDate(3);
const D4 = vnDate(4);
// TA: sau 2 ngày — hạn Từ chối (mặc định 12 giờ trước) còn xa. TB: sau 1 giờ — hạn ĐÃ QUA. TC: ngày thứ 3, để thử Báo bận chồng chuyến.
const TA = await taoOk(TX, { ngay: D2, gio: "10:00" }, { ngay: D2, gio: "12:00" });
const tbBd = vn(Date.now() + 3600_000);
const TB = await taoOk(TX, tbBd, vn(Date.now() + 3 * 3600_000));
const TC = await taoOk(TX, { ngay: D3, gio: "10:00" }, { ngay: D3, gio: "12:00" });
const cua = (id) => `/api/van-chuyen/cuoc-cua-toi/${id}`;
let r;

// --- NT-11 Cổng ---
for (const p of ["/api/orders", "/api/orders/dashboard", "/api/parties", "/api/catalog/for-order", "/api/van-chuyen/lich", "/api/van-chuyen/xe", "/api/van-chuyen/ban-tai-xe"]) {
  assert.equal((await call(TX.cookie, "GET", p)).status, 403, p);
}
const dsCuoc = `/api/van-chuyen/cuoc-cua-toi?tu=${vnDate(0)}&den=${vnDate(5)}`;
r = await call(TX.cookie, "GET", dsCuoc);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.chuyen.map((c) => c.id).sort(), [TA.id, TB.id, TC.id].sort(), "đúng ba chuyến của mình");
assert.equal((await call(TX2.cookie, "GET", dsCuoc)).body.chuyen.length, 0, "tài xế đối tác khác không thấy chuyến của người này");
assert.equal((await call(TX.cookie, "POST", `${cua(TA.id)}/hanh-khach`, { requestId: uuid() })).status, 403, "trip.passenger.add none");
console.log("✓ NT-11: tài xế đối tác 403 ở đơn, Danh bạ, danh mục, lịch chung, xe, ban-tai-xe; Cuốc của tôi 200 chỉ chuyến của mình; bổ sung tên 403");

// --- NT-4 Từ chối ---
r = await call(TX.cookie, "GET", cua(TA.id));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.tuChoiDuoc, true);
assert.ok(r.body.hanTuChoi && r.body.hanTuChoi.ngay && r.body.hanTuChoi.gio, "có hạn Từ chối");
assert.deepEqual(r.body.lyDoTuChoi.map((l) => l.code).sort(), ["TCC_BAN_LICH_KHAC", "TCC_KHAC", "TCC_OM_VIEC_RIENG", "TCC_XE_KHONG_CHAY"]);
// lỗi thân → 400 (lý do thiếu / ngoài nhóm / không có)
for (const body of [{ requestId: uuid() }, { requestId: uuid(), lyDo: "BTX_OM" }, { requestId: uuid(), lyDo: "TCC_KHONG_CO" }]) {
  assert.equal((await call(TX.cookie, "POST", `${cua(TA.id)}/tu-choi`, body)).status, 400, JSON.stringify(body));
}
// cổng: tài xế công ty 403, Toàn quyền không lái 403 (câu riêng), tài xế đối tác khác 404, Kế toán 403, chuyến lạ 404
assert.equal((await call(TXC.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 403, "tài xế công ty");
assert.equal((await call(KT, "POST", `${cua(TA.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 403, "Kế toán");
r = await call(TOAN_QUYEN, "POST", `${cua(TA.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" });
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.equal(r.body.error.message, "Toàn quyền không từ chối thay — đổi người bằng xếp xe.");
assert.equal((await call(TX2.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 404, "IDOR: chuyến của người khác");
assert.equal((await call(TX.cookie, "POST", `${cua(uuid())}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 404, "chuyến không có");
// quá hạn: TB bắt đầu sau 1 giờ, hạn = bắt đầu − 12 giờ đã qua
r = await call(TX.cookie, "GET", cua(TB.id));
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.tuChoiDuoc, false, "quá hạn: máy chủ báo không Từ chối được");
r = await call(TX.cookie, "POST", `${cua(TB.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "refuse_deadline_passed");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_driver WHERE trip_id = '${TB.id}' AND close_reason = 'REFUSED'`))[0].n, 0, "quá hạn: không đóng dòng lái");
// thành công trước hạn
const rid = uuid();
r = await call(TX.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: rid, lyDo: "TCC_BAN_LICH_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { daTuChoi: true }, "không dữ liệu chuyến trong phản hồi");
const [lai] = await sqlRows(`SELECT close_reason, refuse_reason_code, closed_by_party_id, valid_to_at FROM vc_trip_driver WHERE trip_id = '${TA.id}'`);
assert.deepEqual([lai.close_reason, lai.refuse_reason_code, lai.closed_by_party_id], ["REFUSED", "TCC_BAN_LICH_KHAC", TX.party]);
assert.ok(lai.valid_to_at, "dòng lái đã đóng");
const nk = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = '${TA.id}'`);
assert.equal(nk.length, 1, "đúng MỘT dòng nhật ký");
assert.equal(nk[0].detail, `${TA.ma}: tài xế từ chối chuyến — TCC_BAN_LICH_KHAC`, "mã chuyến + mã lý do, không tên, không số điện thoại");
// lệnh lặp: cùng requestId của chính mình → 200, không thêm nhật ký; người khác dùng lại → không 200
r = await call(TX.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: rid, lyDo: "TCC_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = '${TA.id}'`))[0].n, 1, "lệnh lặp không ghi thêm");
r = await call(TX2.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: rid, lyDo: "TCC_KHAC" });
assert.notEqual(r.status, 200, "người khác dùng lại requestId không được 200");
assert.equal((await call(TX.cookie, "POST", `${cua(TA.id)}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" })).status, 404, "đã từ chối rồi: lệnh mới 404");
assert.equal((await call(TX.cookie, "GET", cua(TA.id))).status, 404, "tài xế mở lại chuyến đã từ chối → 404");
console.log("✓ NT-4: Từ chối 200 (REFUSED, lý do, người đóng = chính mình, MỘT nhật ký không tên); lệnh lặp 200; người khác dùng lại requestId không 200; lý do sai 400; tài xế công ty / Kế toán / Toàn quyền 403; tài xế đối tác khác 404; quá hạn 409 refuse_deadline_passed");

// --- NT-7 Sau Từ chối ---
const vp = (await call(ADMIN, "GET", `/api/van-chuyen/chuyen/${TA.id}`)).body;
assert.equal(vp.chuyen.taiXe, null, "chuyến không còn tài xế");
assert.ok(vp.chuyen.lyDoGiu.some((l) => l.ma === "CHUA_CO_TAI_XE"), JSON.stringify(vp.chuyen.lyDoGiu));
assert.equal(vp.tuChoi.length, 1);
assert.equal(vp.tuChoi[0].tenTaiXe, TX.ten);
assert.equal(vp.tuChoi[0].lyDo, "Bận lịch khác", "người có trip.dispatch thấy lý do");
const kt = (await call(KT, "GET", `/api/van-chuyen/chuyen/${TA.id}`)).body;
assert.equal(kt.tuChoi.length, 1);
assert.equal("lyDo" in kt.tuChoi[0], false, "Kế toán không thấy lý do");
assert.ok(!JSON.stringify([kt.tuChoi, kt.nhatKy, kt.chuyen]).match(/Bận lịch khác|TCC_/), "Kế toán không thấy lý do đã chọn ở đâu cả");
const mong = `Tài xế đã từ chối chuyến ${TA.ma}`;
for (const [who, ten] of [[ADMIN, "Quản trị"], [TOAN_QUYEN, "Toàn quyền"]]) {
  const t = (await tin(who)).filter((x) => x.cau.startsWith(mong));
  assert.equal(t.length, 1, `${ten}: ${JSON.stringify(await tin(who))}`);
  assert.ok(t[0].cau.endsWith("— cần xếp người khác"), t[0].cau);
  assert.equal(t[0].lienKet, `/chuyen?id=${TA.id}`);
  assert.doesNotMatch(t[0].cau, new RegExp(`${TX.ten}|Bận lịch|TCC_|${LOC_TEN.source}`));
}
for (const [who, ten] of [[KT, "Kế toán"], [TX.cookie, "tài xế vừa từ chối"], [TX2.cookie, "tài xế khác"], [TXC.cookie, "tài xế công ty"]]) {
  assert.ok(!(await tin(who)).some((x) => x.cau.startsWith(mong)), `${ten} không nhận tin từ chối`);
}
console.log("✓ NT-7: chuyến giữ CHUA_CO_TAI_XE; Quản trị / Toàn quyền nhận tin 'đã từ chối … cần xếp người khác' (không tên, không lý do); Kế toán, tài xế không; lý do chỉ người có trip.dispatch");

// --- NT-8 Báo bận ---
// (a) chồng chuyến TC của chính mình → 409, liệt kê CHỈ chuyến của mình
r = await call(TX.cookie, "POST", "/api/van-chuyen/ban", { batDau: { ngay: D3, gio: "09:00" }, ketThuc: { ngay: D3, gio: "11:00" }, lyDo: "BTX_OM" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "khung_ban_chong_chuyen_tai_xe");
assert.deepEqual(r.body.error.chuyen.map((c) => c.ma), [TC.ma]);
assert.doesNotMatch(r.body.error.message, /Ốm|BTX_/);
// (b) khung ngày thứ 4 → 201 (H7: Location /ban kiểm trong call())
r = await call(TX.cookie, "POST", "/api/van-chuyen/ban", { batDau: { ngay: D4, gio: "08:00" }, ketThuc: { ngay: D4, gio: "12:00" }, lyDo: "BTX_OM" });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.equal(r.headers.get("location"), "/ban");
assert.equal(r.body.khung.length, 1);
const khung = r.body.khung[0];
assert.equal(khung.lyDo, "Ốm");
// (c) văn phòng xếp tài xế vào khung bận → 409 TRUNG_GIO_TAI_XE, câu không lý do
r = await tao(TX, { ngay: D4, gio: "09:00" }, { ngay: D4, gio: "10:00" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.ok(r.body.error.lyDo.some((l) => l.ma === "TRUNG_GIO_TAI_XE"), JSON.stringify(r.body));
assert.doesNotMatch(JSON.stringify(r.body), /Ốm|BTX_/, "câu 409 của văn phòng không có lý do bận (lời chủ 6.2)");
// (d) lớp CSDL: SQL gõ tay khung chồng chuyến đang xếp → trigger; khung chồng chuyến của người khác thì được (khác người)
const tcBd = vnMs(D3, "10:00");
await assert.rejects(
  sql(`INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
       VALUES ('e2e-kb-${duoi}', 'DRIVER', NULL, '${TX.party}', ${tcBd}, ${tcBd + 3600_000}, '${new Date(tcBd).toISOString()}', '${new Date(tcBd + 3600_000).toISOString()}', 'BTX_OM', '${AT}', '${AT}')`),
  /unavailability_overlaps_driver_trip/,
);
// (e) dải văn phòng: Quản trị 200 có tên + nhà xe, KHÔNG lý do; Kế toán, tài xế đối tác, tài xế công ty 403
r = await call(ADMIN, "GET", `/api/van-chuyen/ban-tai-xe?tu=${D4}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
const dong = r.body.khung.find((k) => k.taiXeId === TX.party);
assert.ok(dong, JSON.stringify(r.body));
assert.equal(dong.tenTaiXe, TX.ten);
assert.deepEqual(dong.nhaXe, [`Nhà Xe Từ Chối E2E ${duoi}`]);
assert.doesNotMatch(JSON.stringify(r.body), /Ốm|Việc riêng|BTX_|lyDo|reason/i, "văn phòng chỉ thấy 'bận'");
for (const [who, ten] of [[KT, "Kế toán"], [TX.cookie, "tài xế đối tác"], [TXC.cookie, "tài xế công ty"]]) assert.equal((await call(who, "GET", `/api/van-chuyen/ban-tai-xe?tu=${D4}`)).status, 403, ten);
assert.equal((await call(TXC.cookie, "POST", "/api/van-chuyen/ban", { batDau: { ngay: D4, gio: "08:00" }, ketThuc: { ngay: D4, gio: "09:00" }, lyDo: "BTX_OM" })).status, 403, "tài xế công ty chưa có Báo bận");
// (f) rút: người khác 404; chính chủ 200; rút lần hai 409; rồi văn phòng xếp được
assert.equal((await call(TX2.cookie, "POST", `/api/van-chuyen/ban/${khung.id}/rut`, { version: khung.version })).status, 404, "IDOR: khung của người khác");
r = await call(TX.cookie, "POST", `/api/van-chuyen/ban/${khung.id}/rut`, { version: khung.version });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.khung.length, 0);
r = await call(TX.cookie, "POST", `/api/van-chuyen/ban/${khung.id}/rut`, { version: khung.version });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "khung_ban_vua_doi_route");
const nkBan = await sqlRows(`SELECT action, detail FROM audit_log WHERE target_id = '${TX.party}' AND action LIKE 'driver_unavailability_%' ORDER BY created_at`);
assert.deepEqual(nkBan.map((n) => n.action), ["driver_unavailability_added", "driver_unavailability_withdrawn"]);
assert.ok(nkBan.every((n) => !/Ốm|BTX_/.test(n.detail)), "nhật ký không lý do");
const TD = await taoOk(TX, { ngay: D4, gio: "09:00" }, { ngay: D4, gio: "10:00" });
assert.ok(TD.id, "khung đã rút: văn phòng xếp được");
console.log("✓ NT-8: Báo bận chồng chuyến mình → 409 liệt kê chuyến của mình; 201 + Location /ban; văn phòng xếp vào khung bận → 409 câu không lý do; SQL gõ tay → unavailability_overlaps_driver_trip; dải văn phòng không lý do, Kế toán / tài xế 403; rút một lần, người khác 404; sau rút xếp được");

// --- NT-14 Tin chuyến tới tài xế đối tác đang lái (D7.5) ---
const tinTx = (await tin(TX.cookie)).map((t) => t.cau);
const ngayVn = (n) => `${n.slice(8, 10)}/${n.slice(5, 7)}`;
assert.ok(tinTx.includes(`Bạn được xếp lái chuyến ${TC.ma} ngày ${ngayVn(D3)}`), JSON.stringify(tinTx));
assert.ok(tinTx.every((c) => !LOC_TEN.test(c)), `tin chuyến không mã đơn / tên khách: ${JSON.stringify(tinTx)}`);
let v = (await call(ADMIN, "GET", `/api/van-chuyen/chuyen/${TC.id}`)).body.chuyen.version;
r = await call(ADMIN, "PUT", `/api/van-chuyen/chuyen/${TC.id}`, { version: v, requestId: uuid(), taiXePartyId: TX2.party });
assert.equal(r.status, 200, JSON.stringify(r.body));
const tinTx1 = (await tin(TX.cookie)).map((t) => t.cau);
const tinTx2 = (await tin(TX2.cookie)).map((t) => t.cau);
assert.ok(tinTx1.includes(`Bạn không còn lái chuyến ${TC.ma} ngày ${ngayVn(D3)}`), JSON.stringify(tinTx1));
assert.ok(tinTx2.includes(`Bạn được xếp lái chuyến ${TC.ma} ngày ${ngayVn(D3)}`), JSON.stringify(tinTx2));
assert.ok([...tinTx1, ...tinTx2].every((c) => !LOC_TEN.test(c)), "tin đổi người không mã đơn / tên khách");
console.log("✓ NT-14: tài xế đối tác nhận \"Bạn được xếp lái …\" / \"Bạn không còn lái …\" như tài xế công ty; câu tin không mã đơn, không tên khách (tin giờ hẹn G17: bài máy tai-xe-doi-tac-cuoc.test.ts)");

console.log("E2E TU CHOI BAO BAN OK");
