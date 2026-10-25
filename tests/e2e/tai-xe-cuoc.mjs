// "Cuốc của tôi" + lệnh tiến độ của TÀI XẾ (ADR-0049 D3; kế hoạch mục 1.2, 1.7 route 19–29, 1.8; TC-36, TC-38, TC-39; ruling R-P17 — Task A15) trên API THẬT
// (wrangler dev, D1 local tạm), tài khoản tài xế công ty thật (đăng nhập bằng PIN): danh sách chỉ chuyến mình lái (không tên, không SĐT); chi tiết ngoài ngày
// chạy không tên / liên hệ, sau xuất bến (đang chạy) có; tài xế khác / Bán hàng gọi route tài xế cho chuyến không lái → 404; tài khoản chỉ-DRIVER_PARTNER
// (ADR-0053 D7.1 — kế hoạch A4 T6, nới có tên) gọi route tài xế cho chuyến KHÔNG lái → 404 (danh sách 200 rỗng), bổ sung tên → 403; `xayRaLuc` → 400 `xay_ra_khong_nhan`; "đã đón" hai lần cùng requestId → một sự kiện. Dữ liệu độc nhất theo lần chạy. Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate, moCuaSoXuatBen48Gio } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin); // ADR-0071: chỉ Hành chính nhân sự / Toàn quyền tạo tài khoản (Quản trị không còn)
const SALES = await session(ACCOUNTS.salesA);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(1); // ADR-0096 Đ2 (LC-20): chuyến NGÀY MAI + cửa sổ 48 giờ — xuất bến ngay được, giờ đón vẫn ngoài mốc 6 giờ
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
let r;

const taiKhoan = async (roles) => {
  const x = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Cuốc E2E ${roles.join(" ")} ${duoi}`, phone: randomPhone(), roles });
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
const chuyen = async (taiXe, hau, ngay = D) => {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Cuốc E2E", customerPhone: "0913579246",
    services: [catalogService({ pax: { adult: 2 }, departDate: ngay, legs: [{ direction: "OUT", pickupDate: ngay, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Khách sạn Cuốc E2E ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
    passengers: [{ fullName: "Khách Cuốc E2E 1", birthYear: 1944, paxCode: null }, { fullName: "Khách Cuốc E2E 2", birthYear: 1945, paxCode: null }],
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
  let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: await xe(hau), taiXePartyId: taiXe.party, batDau: { ngay, gio: "09:30" }, ketThuc: { ngay, gio: "12:00" } });
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
assert.ok(r.body.diem.length > 0 && r.body.diem.every((d) => !("diaChiChiDuong" in d)), "ngoài ngày chạy: không chuỗi đích chỉ đường (ADR-0105)");
for (const [who, ten] of [[TX2.cookie, "tài xế khác"], [SALES, "Bán hàng"]]) assert.equal((await call(who, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`)).status, 404, ten);
console.log("✓ route 19 / 20: chỉ chuyến mình lái; ngoài ngày chạy không tên, không liên hệ; tài xế khác / Bán hàng → 404");

// --- 2. Tài khoản chỉ-DRIVER_PARTNER không lái chuyến này → 404 ở route tài xế (ADR-0053 D7.1, A4 T6 — trước: 403); bổ sung tên → 403 (ô none) ---
const DUOI = ["xuat-ben", "diem/x/da-toi", "phan-bo/x/don", "phan-bo/x/vang", "phan-bo/x/khach-huy", "phan-bo/x/tra", "ket-thuc", "ket-thuc-gian-doan", "thu-tu"];
const dsDt = await call(TXDT.cookie, "GET", "/api/van-chuyen/cuoc-cua-toi");
assert.equal(dsDt.status, 200, JSON.stringify(dsDt.body));
assert.ok(!dsDt.body.chuyen.some((c) => c.id === id), "danh sách của tài xế đối tác không có chuyến người khác");
assert.equal((await call(TXDT.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`)).status, 404);
for (const d of DUOI) assert.equal((await call(TXDT.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/${d}`, { requestId: uuid() })).status, 404, d);
assert.equal((await call(TXDT.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/hanh-khach`, { requestId: uuid() })).status, 403, "trip.passenger.add none");
console.log("✓ tài xế đối tác không lái: 404 ở 10 route chuyến, danh sách không có chuyến người khác, bổ sung tên 403");

// --- 2b. ADR-0096 Đ2 (LC-20) trên D1 thật: chuyến BA ngày sau (ngoài cửa sổ 48 giờ mở ở đầu kịch bản) → tài xế bấm Xuất bến 409 NGOAI_CUA_SO_XUAT_BEN
// (Ai xử lý: Văn phòng), không ghi sự kiện, chuyến vẫn kế hoạch. Lớp trigger (vc_trip_departure_window): src/modules/van-chuyen/cua-so-thu-tu-csdl.test.ts.
const xa = await chuyen(TX2, "X", vnDate(3));
r = await call(TX2.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${xa.chuyen.id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual([r.body.error.code, r.body.error.lyDo.map((l) => l.ma)], ["chua_du_dieu_kien_xuat_ben", ["NGOAI_CUA_SO_XUAT_BEN"]], JSON.stringify(r.body));
assert.match(r.body.error.lyDo[0].loiNhan, /được cho xe chạy từ 09:30 ngày \d{2}\/\d{2}\. Xe thật sự chạy sớm thì văn phòng sửa giờ chuyến\./);
assert.equal(r.body.error.lyDo[0].aiXuLy, "VAN_PHONG");
assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = '${xa.chuyen.id}' AND kind = 'DEPARTED'`))[0].n, 0, "không ghi");
assert.equal((await sqlRows(`SELECT status FROM vc_trip WHERE id = '${xa.chuyen.id}'`))[0].status, "PLANNED");
console.log("✓ LC-20 (ADR-0096 Đ2): chuyến ba ngày sau → xuất bến 409 NGOAI_CUA_SO_XUAT_BEN (Văn phòng xử lý), không ghi, chuyến vẫn kế hoạch");

// --- 3. Lệnh tiến độ của tài xế ---
r = await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid(), xayRaLuc: new Date().toISOString() });
assert.deepEqual([r.status, r.body.error.code], [400, "xay_ra_khong_nhan"]);
r = await call(TX.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
// Chuyến ngày D = hôm nay + 1, tài xế bấm Xuất bến HÔM NAY (xuất bến sớm, trong cửa sổ 48 giờ — ADR-0096 Đ2.6 giữ nguyên nghĩa D7.2): Q-L3-B (ADR-0053 D7.2, kẽ G3-9) — đang chạy nhưng xuất bến TRƯỚC ngày chạy
// → KHÔNG trong ngày chạy; tên / liên hệ vẫn vắng. Ca "có tên" trong ngày chạy trên API thật: mục 4 dưới; qua nửa đêm dùng đồng hồ giả: src/modules/van-chuyen/tai-xe-dto.test.ts.
assert.equal(r.body.trongNgayChay, false, "xuất bến sớm (trước ngày chạy) → KHÔNG trong ngày chạy");
assert.ok(r.body.suat.length > 0 && r.body.suat.every((s) => !("hoTen" in s) && !("namSinh" in s)) && !("lienHe" in r.body), "phản hồi lệnh tiến độ không kèm tên / liên hệ (TC-39 — chỉ GET chi tiết)");
assert.ok(r.body.diem.every((d) => !("diaChiChiDuong" in d)), "phản hồi xuất bến (sớm): không chuỗi đích chỉ đường (ADR-0105)");
const [e] = await sqlRows(`SELECT occurred_source, occurred_at, created_at FROM vc_trip_event WHERE trip_id = '${id}' AND kind = 'DEPARTED'`);
assert.deepEqual([e.occurred_source, e.occurred_at], ["MAY_CHU", e.created_at]);
r = await call(TX.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${id}`);
assert.equal(r.body.chuyen.trangThai, "RUNNING");
assert.equal(r.body.trongNgayChay, false);
assert.ok(r.body.suat.length === 2 && r.body.suat.every((s) => !("hoTen" in s) && !("namSinh" in s)), "xuất bến sớm không mở họ tên / năm sinh (Q-L3-B)");
assert.equal("lienHe" in r.body, false, "xuất bến sớm không mở liên hệ (Q-L3-B)");
assert.ok(r.body.diem.every((d) => !("diaChiChiDuong" in d)), "xuất bến sớm không mở chuỗi đích chỉ đường (Q-L3-B, ADR-0105)");
assert.doesNotMatch(JSON.stringify(r.body), /Khách Cuốc|0913579246|Liên Hệ Cuốc/);
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
console.log("✓ lệnh tài xế: xayRaLuc → 400; xuất bến MAY_CHU; xuất bến sớm (trước ngày chạy) vẫn KHÔNG tên, liên hệ (Q-L3-B); đã tới; 'đã đón' lặp cùng requestId → một sự kiện; tài xế khác 404; kết thúc gián đoạn");

// --- 4. TRONG ngày chạy (Q-L3-B, mục VỪA-1 của người kiểm độc lập 30/9): chuyến có ngày chạy = HÔM NAY (ngày VN), tài xế được xếp, bấm Xuất bến → GET chi
// tiết CÓ họ tên, năm sinh, liên hệ. Đi đúng đường nghiệp vụ, không đổi chính sách, không chèn SQL vào bảng đơn / chuyến. ADR-0107 ý (ii): dấu "đặt gấp" chỉ
// ghi lên chặng ĐANG dưới mốc. Chặng 23:50 đã dưới mốc (chạy tối) → Quản trị đóng dấu (route short-notice) rồi mới xác nhận, xếp (ĐP2(ii): xếp chính chặng
// đặt gấp thì qua). Cả giờ xuất bến 23:40 còn ngoài mốc (chạy ban ngày) → bấm Đặt gấp nhận 409 `short_notice_not_needed`, xác nhận và xếp không cần dấu.
// Ở giữa (chuyến 23:40 đã vào mốc mà chặng 23:50 chưa — khoảng 10 phút mỗi ngày, cộng 1 phút dư mỗi bên) và từ 23:40 giờ VN trở đi → BỎ QUA ca này, in một
// dòng (không lách).
const H = vnDate(0);
const gioVnBayGio = new Date(Date.now() + 7 * 3600_000).toISOString().slice(11, 16);
const mocE2e = (await call(SALES, "GET", "/api/orders/moc-toi-thieu")).body.mocToiThieuPhut;
const phutToi = (gio) => (Date.parse(`${H}T${gio}:00+07:00`) - Date.now()) / 60_000;
const changDuoiMoc = phutToi("23:50") < mocE2e - 1;
const chuyenNgoaiMoc = phutToi("23:40") > mocE2e + 1;
if (gioVnBayGio >= "23:40") {
  console.log(`- BỎ QUA ca trong ngày chạy: bây giờ ${gioVnBayGio} giờ VN, sát nửa đêm`);
} else if (!changDuoiMoc && !chuyenNgoaiMoc) {
  console.log(`- BỎ QUA ca trong ngày chạy: bây giờ ${gioVnBayGio} giờ VN — chuyến 23:40 đã vào hạn chốt mà chặng 23:50 chưa (ADR-0107: chưa dưới hạn chốt thì không đặt gấp)`);
} else {
  // ADR-0105: nơi TRẢ là một địa điểm mới có địa chỉ (Quản trị tạo bằng route thật) → giá trị chuỗi đích đã biết trước.
  const DIA_CHI_E2E = `Số 5 Đường Chỉ Đường E2E ${duoi}`;
  const loc = await call(ADMIN, "POST", "/api/locations", { code: `KS_CD_E2E_${duoi}`, name: `Khách sạn Chỉ Đường E2E ${duoi}`, locationTypeCode: "HOTEL", address: `  ${DIA_CHI_E2E}  ` });
  assert.equal(loc.status, 201, JSON.stringify(loc.body));
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Hôm Nay E2E", customerPhone: "0913579247",
    services: [catalogService({ pax: { adult: 1 }, departDate: H, legs: [{ direction: "OUT", pickupDate: H, pickupTime: "23:50", pickupLocationId: null, pickupPlace: `Khách sạn Hôm Nay E2E ${duoi}`, dropoffLocationId: loc.body.location.id, dropoffPlace: "" }] })],
    passengers: [{ fullName: "Khách Hôm Nay E2E", birthYear: 1950, paxCode: null }],
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  const legId = o.body.order.services[0].legs[0].id;
  r = await call(ADMIN, "POST", `/api/orders/${o.body.order.id}/legs/${legId}/short-notice`, { lyDo: "KHACH_DOAN_GOI_GAP" });
  if (changDuoiMoc) assert.equal(r.status, 200, JSON.stringify(r.body));
  else assert.deepEqual([r.status, r.body.error?.code], [409, "short_notice_not_needed"], `ADR-0107: chặng còn ngoài mốc — ${JSON.stringify(r.body)}`);
  r = await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: await xe("C"), taiXePartyId: TX2.party, batDau: { ngay: H, gio: "23:40" }, ketThuc: { ngay: H, gio: "23:59" } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  c = await call(SALES, "POST", `/api/van-chuyen/chuyen/${c.body.chuyen.id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: [{ legId, soSuat: 1 }] });
  assert.equal(c.status, 200, JSON.stringify(c.body));
  const idH = c.body.chuyen.id;
  r = await call(TX2.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${idH}/xuat-ben`, { requestId: uuid() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.chuyen.trangThai, "RUNNING");
  assert.equal(r.body.trongNgayChay, true);
  assert.ok(r.body.diem.every((d) => !("diaChiChiDuong" in d)), "phản hồi lệnh trong ngày chạy: không chuỗi đích chỉ đường (ADR-0105, G18-B)");
  r = await call(TX2.cookie, "GET", `/api/van-chuyen/cuoc-cua-toi/${idH}`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.trongNgayChay, true, "ngày chạy = hôm nay, đã xuất bến → TRONG ngày chạy");
  assert.deepEqual(r.body.suat.map((s) => [s.hoTen, s.namSinh]), [["Khách Hôm Nay E2E", 1950]], "trong ngày chạy có họ tên + năm sinh");
  assert.ok(Array.isArray(r.body.lienHe) && r.body.lienHe.length > 0, "trong ngày chạy có liên hệ (khác rỗng)");
  assert.deepEqual(r.body.lienHe.map((x) => [x.maDon, x.tenLienHe, x.sdtLienHe]), [[r.body.suat[0].maDon, "Liên Hệ Hôm Nay E2E", "0913579247"]]);
  assert.ok(r.body.diem.length === 2 && r.body.diem.every((d) => "diaChiChiDuong" in d), "GET trong ngày chạy: MỌI điểm có chuỗi đích chỉ đường (ADR-0105)");
  const donH = r.body.diem.find((d) => d.loai === "PICKUP");
  const traH = r.body.diem.find((d) => d.loai === "DROPOFF");
  assert.equal(donH.diaChiChiDuong, donH.tenNoi, "điểm đón chữ tự do: chuỗi đích = tên nơi đang thấy");
  assert.equal(traH.diaChiChiDuong, DIA_CHI_E2E, "điểm trả danh mục: địa chỉ đã trim");
  assert.notEqual(traH.tenNoi, DIA_CHI_E2E, "tên nơi vẫn là tên điểm");
  r = await call(TX2.cookie, "POST", `/api/van-chuyen/cuoc-cua-toi/${idH}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ trong ngày chạy (ngày chạy = hôm nay, đặt gấp chỉ khi chặng dưới mốc, đã xuất bến): GET chi tiết có họ tên, năm sinh, liên hệ (Q-L3-B VỪA-1), chuỗi đích chỉ đường ở mọi điểm (địa chỉ danh mục / tên nơi) — phản hồi lệnh không có (ADR-0105)");
}
