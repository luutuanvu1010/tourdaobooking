// CHUYỂN KHÁCH GIỮA HAI XE (gói A5 — ADR-0111, áp ADR-0052 D4, D5c; kế hoạch 2026-10-08 T18) trên API THẬT (wrangler dev, D1 local tạm). Mười tình huống của
// chủ (golden/dieu-phoi-luot-2/xe-a-b-luot-2-chuyen-khach.json — lớp luật thuần ở src/chuyen-khach-ca-mau.test.ts; ở đây chạy NGUYÊN đường route → lô → CSDL):
//   TH01 nhờ xe đang chạy, máy tự đồng ý (+ mã lệnh dùng lại, lệnh 4xx không ghi gì, nhật ký / phản hồi không tên / SĐT)
//   TH02 + NT-A5-24 tắt công tắc tự đồng ý SAU khi gửi → Nhận leo thang → Quản trị duyệt (NGUOI); Bán hàng / Kế toán duyệt → 403
//   TH03 vượt chỗ → leo thang chỉ Bác (Duyệt → 409 không ghi) → Bác (REJECTED, tin tới hai tài xế)
//   TH04 Không nhận có lý do (tin tới xe nhờ) + hết hạn (chờ 1 phút thật: Nhận muộn → 200 HET_HAN, EXPIRED, tin hết giờ)
//   TH05 nhờ hai xe cùng điểm: một xe nhận, đề nghị kia VOID, xe kia Nhận → 409 da_huy
//   TH06 xe nhờ Đã tới điểm trước → đề nghị VOID trong cùng lô; Nhận → 409 da_huy
//   TH07 cứu hộ có nơi gặp (chữ, che số): suất Đã lên sang xe nhận tại điểm nơi gặp, suất Chờ ở nơi đón gốc; xe nhờ kết thúc gián đoạn; xe nhận Đã tới nơi gặp
//   TH08 văn phòng gửi thay cứu hộ (chỉ ONBOARD; người bấm ghi riêng); văn phòng không Nhận thay (403)
//   TH09 sai cam kết (xe riêng trên xe nhận) → leo thang → Quản trị duyệt → khoá phá lệ cam kết của xe nhận
//   TH10 nhờ chéo hai xe, mỗi bên tự đồng ý
//   NT-A5-20 chạy đua: hai xe cùng Nhận một điểm (một thắng, một 409 da_huy); Nhận đúng lúc xe nhờ Rút (đúng một bên thắng)
// Cuối: các câu kiểm định kỳ chuyển khách (R-VC-16, R-VC-31…35, R-VC-SUA-1) trên D1 = 0. Chính sách điều phối đổi rồi KHÔI PHỤC ở `finally`.
// Dữ liệu dùng một lần (SĐT ngẫu nhiên, biển số theo Date.now()); chuyến NGÀY MAI + cửa sổ xuất bến 48 giờ (xuất bến ngay được). Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, orderInput, randomPhone, session, sql, sqlRows, vnDate, moCuaSoXuatBen48Gio } from "./lib.mjs";
import { CHECKS } from "../../scripts/audit-checks.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const KE_TOAN = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551"; // Bến tàu du lịch Nha Trang (0010)
const D = vnDate(1);
await moCuaSoXuatBen48Gio();
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
const VC = "/api/van-chuyen";
const TEN = "Khách Chuyển E2E";
const SDT = "0913579248";
const LO_TEN = /Khách Chuyển E2E|0913579248/;
const nghi = (ms) => new Promise((res) => setTimeout(res, ms));
let soTx = 0;
let soXe = 0;
let r;

// ---- Nền dùng một lần ------------------------------------------------------------------------------------------------------------------------------------
async function datChinhSach(patch) {
  const g = await call(TOAN_QUYEN, "GET", `${VC}/chinh-sach-dieu-phoi`);
  assert.equal(g.status, 200, JSON.stringify(g.body));
  const c = g.body.current;
  await nghi(5); // valid_from_at duy nhất theo mili-giây
  const x = await call(TOAN_QUYEN, "POST", `${VC}/chinh-sach-dieu-phoi`, {
    minLeadMinutes: c.minLeadMinutes, warnLeadMinutes: c.warnLeadMinutes, restMinutes: c.restMinutes, requireManifest: c.requireManifest,
    proxyBackdateMaxMinutes: c.proxyBackdateMaxMinutes, dutyDayMaxMinutes: c.dutyDayMaxMinutes, tripNoBreakMaxMinutes: c.tripNoBreakMaxMinutes,
    departureWindowMinutes: c.departureWindowMinutes, refuseLeadMinutes: c.refuseLeadMinutes, officePhone: c.officePhone, acceptWaitMinutes: c.acceptWaitMinutes, autoConfirmTransfer: c.autoConfirmTransfer, ...patch,
  });
  assert.equal(x.status, 201, JSON.stringify(x.body));
}
/** Tài xế công ty (tài khoản thật, đăng nhập PIN) + GPLX D1. */
async function taiXe() {
  const n = ++soTx;
  const tk = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Tài Xế Chuyển ${n} E2E`, phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
  assert.equal(tk.status, 201, JSON.stringify(tk.body));
  const lg = await login(tk.body.staff.phone, tk.body.pin);
  assert.equal(lg.status, 200, JSON.stringify(lg.body));
  const [{ party_id: party }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${tk.body.staff.id}'`);
  const g = await call(ADMIN, "POST", `/api/parties/${party}/documents`, { typeCode: "GPLX", number: `${70 + (n % 30)}${String(Date.now()).slice(-9)}${n % 10}`, classCode: "D1", expiryDate: vnDate(400) });
  assert.equal(g.status, 201, JSON.stringify(g.body));
  return { cookie: lg.cookie, party, staffId: tk.body.staff.id };
}
/** Xe công ty, đủ Kiểm định + Bảo hiểm. */
async function xe(soCho = 15) {
  const n = ++soXe;
  const id = uuid();
  const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
  const giay = ["INSPECTION", "TPL_INSURANCE"].map((loai) => `INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  await sql([`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79K-${duoi.slice(0, 3)}.${duoi.slice(3)}${n}', '79K${duoi}${n}', 'E2ECK${duoi}${n}', 'E2ECK${duoi}${n}', 'Xe chuyển khách E2E', 2021, ${soCho}, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`, ...giay].join("; ").replace(/\s+/g, " "));
  return id;
}
/** Đơn đã xác nhận, một chặng đón (nơi tự do) → bến tàu. */
async function don(gio, noi, so, chang = {}) {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Chuyển E2E", customerPhone: SDT,
    services: [catalogService({ pax: { adult: so }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: gio, pickupLocationId: null, pickupPlace: `${noi} ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "", ...chang }] })],
    passengers: Array.from({ length: so }, (_, i) => ({ fullName: `${TEN} ${noi} ${i + 1}`, birthYear: 1950 + i, paxCode: null })),
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  const x = await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" });
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return { id: o.body.order.id, legId: o.body.order.services[0].legs[0].id, so };
}
/** Chuyến NGÀY MAI 09:30–12:00, xếp các đơn; `chay` → tài xế xuất bến ngay (cửa sổ 48 giờ). */
async function chuyen(tx, xeId, dons, chay = true) {
  let c = await call(SALES, "POST", `${VC}/chuyen`, { requestId: uuid(), xeId, taiXePartyId: tx.party, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
  assert.equal(c.status, 201, JSON.stringify(c.body));
  const id = c.body.chuyen.id;
  if (dons.length) {
    c = await call(SALES, "POST", `${VC}/chuyen/${id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: dons.map((d) => ({ legId: d.legId, soSuat: d.so })) });
    assert.equal(c.status, 200, JSON.stringify(c.body));
  }
  if (chay) {
    const x = await call(tx.cookie, "POST", `${VC}/cuoc-cua-toi/${id}/xuat-ben`, { requestId: uuid() });
    assert.equal(x.status, 200, JSON.stringify(x.body));
  }
  return id;
}
/** Điểm đón (đang mở) của từng chặng trên chuyến. */
async function diemDon(tripId) {
  const rows = await sqlRows(`SELECT DISTINCT leg_id, board_stop_id FROM vc_trip_allocation WHERE trip_id = '${tripId}' AND kind = 'PASSENGER' AND valid_to_at IS NULL`);
  return Object.fromEntries(rows.map((x) => [x.leg_id, x.board_stop_id]));
}
/** Hai (hoặc ba) xe đang chạy, mỗi xe một tài xế, xe A có các đơn `donA`, xe B có `donB`… */
async function theGioi(...cacDon) {
  const tx = [];
  const id = [];
  for (const dons of cacDon) {
    const t = await taiXe();
    tx.push(t);
    id.push(await chuyen(t, await xe(), dons));
  }
  return { tx, id };
}

const gui = (tx, tu, than, requestId = uuid()) => call(tx.cookie, "POST", `${VC}/cuoc-cua-toi/${tu}/de-nghi`, { requestId, ...than });
const nhan = (who, rid, requestId = uuid()) => call(who.cookie ?? who, "POST", `${VC}/de-nghi/${rid}/nhan`, { requestId });
const khongNhan = (tx, rid, lyDo) => call(tx.cookie, "POST", `${VC}/de-nghi/${rid}/khong-nhan`, { requestId: uuid(), lyDo });
const rut = (tx, rid) => call(tx.cookie, "POST", `${VC}/de-nghi/${rid}/rut`, { requestId: uuid() });
const duyet = (who, rid, lyDo = "PHA_LE_SU_CO") => call(who, "POST", `${VC}/de-nghi/${rid}/duyet`, { requestId: uuid(), lyDo });
const bac = (who, rid, lyDo) => call(who, "POST", `${VC}/de-nghi/${rid}/bac`, { requestId: uuid(), lyDo });
const deNghiVp = async (rid) => (await call(ADMIN, "GET", `${VC}/de-nghi?ngay=${D}`)).body.deNghi.find((d) => d.id === rid);
const loi = (x, status, code) => assert.deepEqual([x.status, x.body?.error?.code], [status, code], JSON.stringify(x.body));
const ok = (x, ketQua, trangThai) => {
  assert.equal(x.status, 200, JSON.stringify(x.body));
  assert.deepEqual([x.body.ketQua, x.body.deNghi.trangThai], [ketQua, trangThai]);
  assert.doesNotMatch(JSON.stringify(x.body), LO_TEN, "phản hồi lệnh không tên / SĐT khách");
};
async function tinCua(tx, re, ms = 4000) {
  const het = Date.now() + ms;
  for (;;) {
    const x = await call(tx.cookie, "GET", "/api/thong-bao?ngan=cua-toi");
    assert.equal(x.status, 200, JSON.stringify(x.body));
    const ds = x.body.tin.filter((t) => t.loai === "chuyen" && re.test(t.cau));
    if (ds.length || Date.now() > het) return ds;
    await nghi(150);
  }
}
const yeuCau = async (rid) => (await sqlRows(`SELECT status, decided_mode, closed_cmd_id, decided_cmd_id FROM vc_transfer_request WHERE id = '${rid}'`))[0];

// Lý do Không nhận / Bác (nhóm TU_CHOI_NHAN) — đọc từ phản hồi danh sách văn phòng (cùng nguồn màn duyệt dùng).
r = await call(ADMIN, "GET", `${VC}/de-nghi?ngay=${D}`);
assert.equal(r.status, 200, JSON.stringify(r.body));
const TU_CHOI = r.body.lyDo.find((l) => l.nhom === "TU_CHOI_NHAN")?.code;
assert.ok(TU_CHOI && r.body.lyDo.some((l) => l.code === "PHA_LE_SU_CO"), JSON.stringify(r.body.lyDo));
assert.equal((await call(KE_TOAN, "GET", `${VC}/de-nghi?ngay=${D}`)).status, 200, "Kế toán xem danh sách chỉ-đọc (trip.view)");

try {
  // ==== TH04-4B mở đầu: đề nghị gửi lúc chính sách chờ 1 phút (để Nhận muộn ở cuối kịch bản). Hạn chờ theo dòng chính sách LÚC GỬI (MQ-08). ====
  const d4a = await don("10:00", "Khách sạn Không Nhận", 2);
  const d4b = await don("10:15", "Khách sạn Hết Hạn", 1);
  const w4 = await theGioi([d4a, d4b], []);
  const diem4 = await diemDon(w4.id[0]);
  await datChinhSach({ acceptWaitMinutes: 1 });
  let ridHetHan;
  const guiHetHanLuc = Date.now();
  try {
    r = await gui(w4.tx[0], w4.id[0], { denChuyenId: w4.id[1], phamVi: "STOP", diemId: diem4[d4b.legId] });
    ok(r, "DA_GUI", "PENDING");
    ridHetHan = r.body.deNghi.id;
  } finally {
    await datChinhSach({ acceptWaitMinutes: 10 });
  }
  console.log("✓ TH04-4B: gửi một đề nghị lúc chính sách chờ 1 phút (Nhận muộn ở cuối)");

  // ==== TH01 nhờ xe đang chạy, máy tự đồng ý ====
  const d1 = await don("10:00", "Khách sạn Mường Thanh", 3);
  const d1b = await don("10:30", "Khách sạn Hòn Chồng", 2);
  const w1 = await theGioi([d1], [d1b]);
  const [A1, B1] = w1.tx;
  const diem1 = (await diemDon(w1.id[0]))[d1.legId];
  r = await call(A1.cookie, "GET", `${VC}/cuoc-cua-toi/${w1.id[0]}/xe-nhan?phamVi=STOP`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.xe.some((x) => x.tripId === w1.id[1]), "xe B có trong danh sách xe nhận");
  assert.ok(!r.body.xe.some((x) => x.tripId === w1.id[0]), "không tự nhờ chính mình");
  assert.doesNotMatch(JSON.stringify(r.body), LO_TEN);
  const maGui1 = uuid();
  const than1 = { denChuyenId: w1.id[1], phamVi: "STOP", diemId: diem1 };
  r = await gui(A1, w1.id[0], than1, maGui1);
  ok(r, "DA_GUI", "PENDING");
  assert.equal(r.body.deNghi.soKhach, 3);
  const rid1 = r.body.deNghi.id;
  r = await gui(A1, w1.id[0], than1, maGui1);
  assert.equal(r.status, 200, "gửi lại cùng mã lệnh → kết quả cũ");
  assert.equal(r.body.deNghi.id, rid1);
  assert.ok((await tinCua(B1, /đề nghị chuyển khách tới/)).length >= 1, "tài xế xe nhận có tin");
  assert.equal((await tinCua(A1, /đề nghị chuyển khách tới/, 0)).length, 0, "người gửi không tự nhận tin");
  const maNhan1 = uuid();
  r = await nhan(B1, rid1, maNhan1);
  ok(r, "DA_CHUYEN", "CONFIRMED");
  r = await nhan(B1, rid1, maNhan1);
  assert.deepEqual([r.status, r.body.ketQua], [200, "DA_CHUYEN"], "Nhận lại cùng mã lệnh → kết quả cũ");
  const [q1] = await sqlRows(`SELECT r.decided_mode AS mode,
      (SELECT count(*) FROM vc_trip_event e WHERE e.request_id = '${maNhan1}') AS ev,
      (SELECT count(*) FROM vc_trip_event e WHERE e.request_id = '${maGui1}') AS evGui,
      (SELECT status FROM vc_trip_stop WHERE id = '${diem1}') AS diemNguon,
      (SELECT count(*) FROM vc_trip_allocation a WHERE a.closed_transfer_id = r.id AND a.close_reason = 'TRANSFERRED') AS dong,
      (SELECT count(*) FROM vc_trip_allocation a WHERE a.transfer_id = r.id AND a.trip_id = '${w1.id[1]}' AND a.valid_to_at IS NULL) AS mo,
      (SELECT count(*) FROM audit_log l WHERE l.action LIKE 'trip_transfer_%' AND (l.detail LIKE '%${TEN}%' OR l.detail LIKE '%${SDT}%')) AS loNhatKy
    FROM vc_transfer_request r WHERE r.id = '${rid1}'`);
  assert.deepEqual([q1.mode, q1.ev, q1.evGui, q1.diemNguon, q1.dong, q1.mo, q1.loNhatKy], ["MAY", 1, 1, "MOVED", 3, 3, 0], JSON.stringify(q1));
  assert.ok((await tinCua(A1, /Xe nhận đã nhận khách/)).length >= 1, "tài xế xe nhờ có tin xác nhận");
  // Lệnh 4xx không ghi gì: gửi lại điểm đã chuyển (MOVED) → 409, số đề nghị không đổi; mã lệnh cũ cho đề nghị khác → 409.
  const [{ n: truoc }] = await sqlRows(`SELECT count(*) AS n FROM vc_transfer_request WHERE from_trip_id = '${w1.id[0]}'`);
  loi(await gui(A1, w1.id[0], than1), 409, "ck_diem_khong_cho");
  loi(await gui(A1, w1.id[0], { ...than1, diemId: uuid() }, maGui1), 409, "request_id_reused");
  const [{ n: sau }] = await sqlRows(`SELECT count(*) AS n FROM vc_transfer_request WHERE from_trip_id = '${w1.id[0]}'`);
  assert.equal(sau, truoc, "lệnh 409 không ghi đề nghị");
  console.log("✓ TH01: xe nhận đang chạy, Nhận → máy tự đồng ý (MAY), 3 suất đóng / 3 suất mở, điểm nguồn MOVED, một sự kiện, tin hai phía; mã lệnh dùng lại; 409 không ghi; nhật ký không tên");

  // ==== TH02 + NT-A5-24: công tắc tự đồng ý tắt SAU khi gửi → Nhận leo thang → Quản trị duyệt ====
  const d2 = await don("10:00", "Khách sạn Duyệt Tay", 2);
  const w2 = await theGioi([d2], []);
  const [A2, B2] = w2.tx;
  r = await gui(A2, w2.id[0], { denChuyenId: w2.id[1], phamVi: "STOP", diemId: (await diemDon(w2.id[0]))[d2.legId] });
  ok(r, "DA_GUI", "PENDING");
  const rid2 = r.body.deNghi.id;
  await datChinhSach({ autoConfirmTransfer: false });
  try {
    r = await nhan(B2, rid2);
    ok(r, "LEO_THANG", "ESCALATED");
  } finally {
    await datChinhSach({ autoConfirmTransfer: true });
  }
  let dn = await deNghiVp(rid2);
  assert.equal(dn.hop, "DUYET_HOAC_BAC");
  assert.ok(dn.kiem.length === 11 && dn.kiem.every((k) => k.ketQua !== "KHONG_DAT"), "leo thang vì công tắc tắt, không vì điều kiện");
  loi(await rut(A2, rid2), 409, "da_leo_thang");
  for (const who of [SALES, KE_TOAN]) assert.equal((await duyet(who, rid2)).status, 403, "chỉ trip.override duyệt");
  r = await duyet(ADMIN, rid2);
  ok(r, "DA_CHUYEN", "CONFIRMED");
  assert.equal((await yeuCau(rid2)).decided_mode, "NGUOI");
  console.log("✓ TH02 / NT-A5-24: công tắc tắt sau khi gửi → Nhận leo thang (không có điều kiện Không đạt); Rút → 409; Bán hàng / Kế toán duyệt 403; Quản trị duyệt → NGUOI");

  // ==== TH03 vượt chỗ → chỉ Bác ====
  const d3a = await don("10:00", "Khách sạn Alibu", 2);
  const d3b = await don("10:30", "Khách sạn Đầy Chỗ", 3);
  const A3 = await taiXe();
  const B3 = await taiXe();
  const a3 = await chuyen(A3, await xe(), [d3a]);
  const b3 = await chuyen(B3, await xe(4), [d3b]); // xe nhận 4 chỗ, đã 3 khách
  r = await gui(A3, a3, { denChuyenId: b3, phamVi: "STOP", diemId: (await diemDon(a3))[d3a.legId] });
  ok(r, "DA_GUI", "PENDING");
  const rid3 = r.body.deNghi.id;
  ok(await nhan(B3, rid3), "LEO_THANG", "ESCALATED");
  dn = await deNghiVp(rid3);
  assert.equal(dn.hop, "CHI_BAC");
  assert.deepEqual(dn.kiem.filter((k) => k.ketQua === "KHONG_DAT").map((k) => [k.ma, k.giaTri, k.gioiHan]), [["SUC_CHUA_DICH", 5, 4]]);
  r = await duyet(ADMIN, rid3);
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal((await yeuCau(rid3)).status, "ESCALATED", "Duyệt 409 không ghi");
  r = await bac(ADMIN, rid3, TU_CHOI);
  ok(r, "DA_BAC", "REJECTED");
  assert.ok((await tinCua(A3, /không duyệt/)).length >= 1 && (await tinCua(B3, /không duyệt/)).length >= 1, "Bác: tin tới hai tài xế");
  console.log("✓ TH03: vượt chỗ (5/4) → leo thang chỉ Bác; Duyệt 409 không ghi; Bác → REJECTED, tin hai tài xế");

  // ==== TH04-4A Không nhận ====
  r = await gui(w4.tx[0], w4.id[0], { denChuyenId: w4.id[1], phamVi: "STOP", diemId: diem4[d4a.legId] });
  ok(r, "DA_GUI", "PENDING");
  const rid4 = r.body.deNghi.id;
  r = await khongNhan(w4.tx[1], rid4, "PHA_LE_SU_CO");
  assert.equal(r.status, 400, "lý do ngoài nhóm Không nhận");
  ok(await khongNhan(w4.tx[1], rid4, TU_CHOI), "KHONG_NHAN", "DECLINED");
  assert.ok((await tinCua(w4.tx[0], /không nhận khách/)).length >= 1, "Đ3 (d): tin tới xe nhờ");
  console.log("✓ TH04-4A: Không nhận (lý do ngoài nhóm → 400) → DECLINED, tin tới xe nhờ");

  // ==== TH05 nhờ hai xe cùng điểm; NT-A5-20 hai xe cùng Nhận một điểm ====
  const d5 = await don("10:00", "Khách sạn Hai Xe", 2);
  const w5 = await theGioi([d5], [], []);
  const diem5 = (await diemDon(w5.id[0]))[d5.legId];
  const guiToi = async (w, diem, den) => {
    const x = await gui(w.tx[0], w.id[0], { denChuyenId: den, phamVi: "STOP", diemId: diem });
    ok(x, "DA_GUI", "PENDING");
    return x.body.deNghi.id;
  };
  const rid5b = await guiToi(w5, diem5, w5.id[1]);
  const rid5c = await guiToi(w5, diem5, w5.id[2]);
  ok(await nhan(w5.tx[1], rid5b), "DA_CHUYEN", "CONFIRMED");
  const q5 = await yeuCau(rid5c);
  assert.equal(q5.status, "VOID");
  assert.equal(q5.closed_cmd_id, (await yeuCau(rid5b)).decided_cmd_id, "VOID cùng lô xác nhận");
  loi(await nhan(w5.tx[2], rid5c), 409, "da_huy");
  console.log("✓ TH05: nhờ hai xe cùng điểm; một xe Nhận → đề nghị kia VOID cùng lô; xe kia Nhận → 409 da_huy");

  const d20 = await don("10:00", "Khách sạn Chạy Đua", 2);
  const d20b = await don("10:15", "Khách sạn Rút Đua", 1);
  const w20 = await theGioi([d20, d20b], [], []);
  const diem20 = await diemDon(w20.id[0]);
  const ridB = await guiToi(w20, diem20[d20.legId], w20.id[1]);
  const ridC = await guiToi(w20, diem20[d20.legId], w20.id[2]);
  const dua = await Promise.all([nhan(w20.tx[1], ridB), nhan(w20.tx[2], ridC)]);
  assert.deepEqual(dua.map((x) => x.status).sort(), [200, 409], JSON.stringify(dua.map((x) => x.body)));
  const thua = dua.find((x) => x.status === 409);
  assert.equal(thua.body.error.code, "da_huy", JSON.stringify(thua.body));
  const [{ n: confirmed }] = await sqlRows(`SELECT count(*) AS n FROM vc_transfer_request WHERE id IN ('${ridB}', '${ridC}') AND status = 'CONFIRMED'`);
  assert.equal(confirmed, 1, "đúng một bên thắng");
  const ridR = await guiToi(w20, diem20[d20b.legId], w20.id[1]);
  const duaRut = await Promise.all([nhan(w20.tx[1], ridR), rut(w20.tx[0], ridR)]);
  const thang = duaRut.filter((x) => x.status === 200);
  assert.equal(thang.length, 1, JSON.stringify(duaRut.map((x) => [x.status, x.body])));
  assert.equal(duaRut.find((x) => x.status !== 200).status, 409);
  assert.equal((await yeuCau(ridR)).status, thang[0].body.ketQua === "DA_CHUYEN" ? "CONFIRMED" : "WITHDRAWN");
  console.log(`✓ NT-A5-20: hai xe cùng Nhận một điểm → một thắng, một 409 da_huy; Nhận đúng lúc Rút → đúng một bên thắng (${thang[0].body.ketQua})`);

  // ==== TH06 xe nhờ Đã tới trước → tự huỷ ====
  const d6 = await don("10:00", "Khách sạn Tới Trước", 1);
  const w6 = await theGioi([d6], []);
  const diem6 = (await diemDon(w6.id[0]))[d6.legId];
  const rid6 = await guiToi(w6, diem6, w6.id[1]);
  r = await call(w6.tx[0].cookie, "POST", `${VC}/cuoc-cua-toi/${w6.id[0]}/diem/${diem6}/da-toi`, { requestId: uuid() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await yeuCau(rid6)).status, "VOID");
  const [{ n: ev6 }] = await sqlRows(`SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = '${w6.id[1]}' AND related_trip_id = '${w6.id[0]}' AND kind LIKE 'TRANSFER_%'`);
  assert.equal(ev6, 1, "chỉ sự kiện gửi — VOID không có sự kiện riêng");
  loi(await nhan(w6.tx[1], rid6), 409, "da_huy");
  console.log("✓ TH06: xe nhờ Đã tới điểm → đề nghị VOID trong lô Đã tới (không sự kiện riêng); Nhận → 409 da_huy");

  // ==== TH07 cứu hộ có nơi gặp (tài xế gửi) ====
  const d7a = await don("10:00", "Khách sạn Sheraton", 2);
  const d7b = await don("10:15", "Khách sạn Mường Thanh Cứu Hộ", 1);
  const d7c = await don("10:30", "Khách sạn Xe Cứu", 1);
  const w7 = await theGioi([d7a, d7b], [d7c]);
  const [A7, C7] = w7.tx;
  const diem7 = await diemDon(w7.id[0]);
  r = await call(A7.cookie, "POST", `${VC}/cuoc-cua-toi/${w7.id[0]}/diem/${diem7[d7a.legId]}/da-toi`, { requestId: uuid() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  for (const { id: aid } of await sqlRows(`SELECT id FROM vc_trip_allocation WHERE trip_id = '${w7.id[0]}' AND leg_id = '${d7a.legId}' AND valid_to_at IS NULL`)) {
    r = await call(A7.cookie, "POST", `${VC}/cuoc-cua-toi/${w7.id[0]}/phan-bo/${aid}/don`, { requestId: uuid() });
    assert.equal(r.status, 200, JSON.stringify(r.body));
  }
  loi(await call(A7.cookie, "GET", `${VC}/cuoc-cua-toi/${w7.id[0]}/xe-nhan?phamVi=SAI`), 400, "invalid_input");
  r = await gui(A7, w7.id[0], { denChuyenId: w7.id[1], phamVi: "ONBOARD", noiGap: { chu: "Cây xăng Phước Đồng 0905123456" } });
  ok(r, "DA_GUI", "PENDING");
  const rid7 = r.body.deNghi.id;
  assert.equal(r.body.deNghi.soKhach, 3);
  assert.ok(r.body.deNghi.noiGap.startsWith("Cây xăng Phước Đồng") && !r.body.deNghi.noiGap.includes("0905123456"), r.body.deNghi.noiGap);
  ok(await nhan(C7, rid7), "DA_CHUYEN", "CONFIRMED");
  const mo7 = await sqlRows(`SELECT a.status, s.id AS stop, s.added_while_running AS moi, s.place_text AS noi FROM vc_trip_allocation a JOIN vc_trip_stop s ON s.id = a.board_stop_id
    WHERE a.trip_id = '${w7.id[1]}' AND a.transfer_id = '${rid7}' AND a.valid_to_at IS NULL ORDER BY a.status`.replace(/\s+/g, " "));
  assert.deepEqual(mo7.map((x) => x.status), ["BOARDED", "BOARDED", "WAITING"], JSON.stringify(mo7));
  const noiGap7 = mo7[0].stop;
  assert.equal(mo7[0].moi, 1, "điểm nơi gặp thêm khi xe nhận đang chạy");
  assert.ok(!String(mo7[0].noi ?? "").includes("0905123456"), "điểm nơi gặp: chữ đã che");
  assert.ok(String(mo7[2].noi).startsWith("Khách sạn Mường Thanh Cứu Hộ"), "khách Chờ đón ở nơi đón gốc");
  r = await call(A7.cookie, "POST", `${VC}/cuoc-cua-toi/${w7.id[0]}/ket-thuc-gian-doan`, { requestId: uuid(), lyDo: "GIAN_DOAN_KHAC" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(C7.cookie, "POST", `${VC}/cuoc-cua-toi/${w7.id[1]}/diem/${noiGap7}/da-toi`, { requestId: uuid() });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  console.log("✓ TH07: cứu hộ có nơi gặp (chữ che số) → 2 khách Đã lên sang xe nhận ở điểm nơi gặp mới, 1 khách Chờ ở nơi đón gốc; xe nhờ kết thúc gián đoạn; xe nhận Đã tới nơi gặp");

  // ==== TH08 văn phòng gửi thay cứu hộ ====
  const d8 = await don("10:00", "Khách sạn Văn Phòng Gửi", 2);
  const w8 = await theGioi([d8], []);
  const [A8, C8] = w8.tx;
  r = await call(SALES, "GET", `${VC}/chuyen/${w8.id[0]}/xe-nhan`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.ok(r.body.xe.some((x) => x.tripId === w8.id[1]));
  assert.equal((await call(KE_TOAN, "GET", `${VC}/chuyen/${w8.id[0]}/xe-nhan`)).status, 403);
  r = await call(SALES, "POST", `${VC}/chuyen/${w8.id[0]}/cuu-ho`, { requestId: uuid(), denChuyenId: w8.id[1], phamVi: "STOP", diemId: (await diemDon(w8.id[0]))[d8.legId] });
  assert.equal(r.status, 403, "văn phòng chỉ gửi thay cứu hộ");
  assert.equal((await call(KE_TOAN, "POST", `${VC}/chuyen/${w8.id[0]}/cuu-ho`, { requestId: uuid(), denChuyenId: w8.id[1], phamVi: "ONBOARD", noiGap: { chu: "Ngã ba Thành" } })).status, 403);
  r = await call(SALES, "POST", `${VC}/chuyen/${w8.id[0]}/cuu-ho`, { requestId: uuid(), denChuyenId: w8.id[1], phamVi: "ONBOARD", noiGap: { chu: "Cây xăng Phước Đồng, QL1A" } });
  ok(r, "DA_GUI", "PENDING");
  const rid8 = r.body.deNghi.id;
  const [{ id: salesId }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
  const [q8] = await sqlRows(`SELECT proposed_by_party_id AS p, proposed_by_staff_id AS s FROM vc_transfer_request WHERE id = '${rid8}'`);
  assert.deepEqual([q8.p, q8.s], [A8.party, salesId], "người gửi = tài xế xe nhờ; người bấm = Bán hàng");
  assert.equal((await nhan(SALES, rid8)).status, 403, "văn phòng không bấm Nhận thay (không có ô trip.transfer — ADR-0052:248, golden TH08-4A)");
  ok(await nhan(C8, rid8), "DA_CHUYEN", "CONFIRMED");
  console.log("✓ TH08: Bán hàng gửi thay cứu hộ (STOP → 403; Kế toán 403); người bấm ghi riêng; văn phòng Nhận → 403; tài xế xe nhận Nhận → chuyển");

  // ==== TH09-9A sai cam kết: xe nhận chở đơn xe riêng ====
  const d9 = await don("10:00", "Khách sạn Thêm Khách", 1);
  const d9r = await don("10:30", "Khách sạn Xe Riêng", 2, { exclusiveVehicle: true });
  const w9 = await theGioi([d9], [d9r]);
  r = await gui(w9.tx[0], w9.id[0], { denChuyenId: w9.id[1], phamVi: "STOP", diemId: (await diemDon(w9.id[0]))[d9.legId] });
  ok(r, "DA_GUI", "PENDING");
  const rid9 = r.body.deNghi.id;
  ok(await nhan(w9.tx[1], rid9), "LEO_THANG", "ESCALATED");
  dn = await deNghiVp(rid9);
  assert.equal(dn.hop, "DUYET_HOAC_BAC");
  assert.deepEqual(dn.kiem.filter((k) => k.ketQua === "KHONG_DAT").map((k) => [k.ma, k.tang]), [["CAM_KET_DICH", "CAU_HINH"]]);
  ok(await duyet(ADMIN, rid9), "DA_CHUYEN", "CONFIRMED");
  const [q9] = await sqlRows(`SELECT commitment_override_reason_code AS r, commitment_override_key AS k FROM vc_trip WHERE id = '${w9.id[1]}'`);
  assert.ok(q9.r === "PHA_LE_SU_CO" && q9.k, `khoá phá lệ cam kết của xe nhận: ${JSON.stringify(q9)}`);
  console.log("✓ TH09-9A: sai cam kết xe riêng → leo thang (Cấu hình) → Quản trị duyệt → khoá phá lệ cam kết của xe nhận");

  // ==== TH10 nhờ chéo ====
  const p1 = await don("10:00", "Khách sạn Chéo A1", 1);
  const p2 = await don("10:15", "Khách sạn Chéo A2", 1);
  const q1d = await don("10:30", "Khách sạn Chéo B1", 1);
  const q2 = await don("10:45", "Khách sạn Chéo B2", 1);
  const w10 = await theGioi([p1, p2], [q1d, q2]);
  const [A10, B10] = w10.tx;
  r = await gui(A10, w10.id[0], { denChuyenId: w10.id[1], phamVi: "STOP", diemId: (await diemDon(w10.id[0]))[p1.legId] });
  ok(r, "DA_GUI", "PENDING");
  const ridAB = r.body.deNghi.id;
  r = await gui(B10, w10.id[1], { denChuyenId: w10.id[0], phamVi: "STOP", diemId: (await diemDon(w10.id[1]))[q1d.legId] });
  ok(r, "DA_GUI", "PENDING");
  const ridBA = r.body.deNghi.id;
  ok(await nhan(B10, ridAB), "DA_CHUYEN", "CONFIRMED");
  ok(await nhan(A10, ridBA), "DA_CHUYEN", "CONFIRMED");
  const mA = await diemDon(w10.id[0]); // tuần tự: hai `wrangler d1 execute` đồng thời hay rơi 'internal error' (D1 local)
  const mB = await diemDon(w10.id[1]);
  assert.deepEqual([Object.keys(mA).sort(), Object.keys(mB).sort()], [[p2.legId, q1d.legId].sort(), [q2.legId, p1.legId].sort()]);
  console.log("✓ TH10: nhờ chéo hai xe — mỗi lần nhờ xét riêng, cả hai tự đồng ý");

  // ==== TH11 (ADR-0113): tài xế ĐỐI TÁC là xe nhận, khách chuyển vào → Từ chối chuyến bị chặn 409 refuse_blocked_transferred_in (không tên / mã đơn), DTO có chanTuChoi ====
  {
    const lead0 = (await call(TOAN_QUYEN, "GET", `${VC}/chinh-sach-dieu-phoi`)).body.current.refuseLeadMinutes;
    await datChinhSach({ refuseLeadMinutes: 60 }); // hạn Từ chối = giờ chạy − 60 phút (nhỏ nhất cho phép): còn hạn dù kịch bản chạy lúc nào trong ngày (hạn chụp lúc xếp chuyến)
    try {
      const nx = await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Nhà Xe Chặn Từ Chối ${duoi}` });
      assert.equal(nx.status, 201, JSON.stringify(nx.body));
      const nhaXe = nx.body.party.id;
      assert.equal((await call(ADMIN, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" })).status, 201);
      const tkp = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Tài Xế Đối Tác Chặn ${duoi}`, phone: randomPhone(), roles: ["DRIVER_EXTERNAL"] });
      assert.equal(tkp.status, 201, JSON.stringify(tkp.body));
      const lgp = await login(tkp.body.staff.phone, tkp.body.pin);
      assert.equal(lgp.status, 200, JSON.stringify(lgp.body));
      const [{ party_id: partyP }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${tkp.body.staff.id}'`);
      assert.equal((await call(ADMIN, "POST", `/api/parties/${partyP}/documents`, { typeCode: "GPLX", number: `7953${duoi}11`, classCode: "D2", expiryDate: vnDate(400) })).status, 201);
      assert.equal((await call(ADMIN, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: partyP, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" })).status, 201);
      const xeDt = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: `79T-${duoi.slice(0, 3)}.${duoi.slice(3)}`, chassisNumber: `E2ECHAN${duoi}`, name: "Xe nhà xe chặn Từ chối E2E", passengerCapacity: 15, ownerPartyId: nhaXe });
      assert.equal(xeDt.status, 201, JSON.stringify(xeDt.body));
      for (const typeCode of ["INSPECTION", "TPL_INSURANCE"]) {
        assert.equal((await call(ADMIN, "POST", `/api/van-chuyen/xe/${xeDt.body.vehicle.id}/giay-to`, { typeCode, number: `${typeCode}-${duoi}`, expiryDate: vnDate(400) })).status, 201, typeCode);
      }
      const dX = await don("10:00", "Khách sạn Chặn Từ Chối", 2);
      const w11 = await theGioi([dX]);
      const tripB = await chuyen({ cookie: lgp.cookie, party: partyP }, xeDt.body.vehicle.id, [], false);
      const diem11 = await diemDon(w11.id[0]);
      r = await gui(w11.tx[0], w11.id[0], { denChuyenId: tripB, phamVi: "STOP", diemId: diem11[dX.legId] });
      ok(r, "DA_GUI", "PENDING");
      const rid11 = r.body.deNghi.id;
      r = await nhan(lgp.cookie, rid11);
      if (r.body?.ketQua === "LEO_THANG") r = await duyet(ADMIN, rid11); // xe nhận chưa chạy; kịch bản chạy gần giờ chạy → dưới mốc 6 giờ → văn phòng duyệt
      ok(r, "DA_CHUYEN", "CONFIRMED");
      assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_allocation WHERE trip_id = '${tripB}' AND transfer_id IS NOT NULL AND valid_to_at IS NULL`))[0].n, 2, "khách đã chuyển vào chuyến của tài xế đối tác");
      const cuaB = `${VC}/cuoc-cua-toi/${tripB}`;
      r = await call(lgp.cookie, "GET", cuaB);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.chanTuChoi, "KHACH_CHUYEN_VAO", JSON.stringify(r.body));
      assert.equal(r.body.tuChoiDuoc, false);
      assert.equal("lyDoTuChoi" in r.body, false, "bị chặn → không kèm lý do Từ chối");
      r = await call(lgp.cookie, "POST", `${cuaB}/tu-choi`, { requestId: uuid(), lyDo: "TCC_KHAC" });
      loi(r, 409, "refuse_blocked_transferred_in");
      assert.equal(r.body.error.message, "Chuyến này đang có khách được chuyển từ xe khác sang nên chưa từ chối được — hãy gọi văn phòng để đổi người.");
      assert.doesNotMatch(JSON.stringify(r.body), /Khách Chuyển E2E|0913579248|TD-\d{8}|CX-\d/, "thân 409 không tên, không mã đơn, không mã chuyến");
      assert.equal((await sqlRows(`SELECT count(*) AS n FROM vc_trip_driver WHERE trip_id = '${tripB}' AND valid_to_at IS NULL`))[0].n, 1, "dòng lái vẫn mở");
      assert.equal((await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE action = 'trip_driver_refused' AND target_id = '${tripB}'`))[0].n, 0, "không nhật ký Từ chối");
      console.log("✓ TH11 (ADR-0113): tài xế đối tác nhận khách chuyển vào → DTO chanTuChoi + tuChoiDuoc false; Từ chối trong hạn → 409 refuse_blocked_transferred_in (đúng câu, không tên / mã đơn), dòng lái vẫn mở, không nhật ký");
    } finally {
      await datChinhSach({ refuseLeadMinutes: lead0 });
    }
  }

  // ==== TH04-4B Nhận muộn (đề nghị gửi lúc chính sách chờ 1 phút) ====
  const conCho = guiHetHanLuc + 62_000 - Date.now();
  if (conCho > 0) await nghi(conCho);
  r = await nhan(w4.tx[1], ridHetHan);
  ok(r, "HET_HAN", "EXPIRED");
  assert.ok((await tinCua(w4.tx[0], /hết giờ chờ/)).length >= 1, "tin hết hạn tới xe nhờ lúc bấm muộn");
  console.log("✓ TH04-4B: Nhận sau hạn chờ (1 phút của dòng chính sách lúc gửi) → 200 HET_HAN, EXPIRED, tin hết giờ tới xe nhờ");
} finally {
  // Khôi phục mặc định chuyển khách của chính sách (10 phút, bật) — hai lệnh đổi ở trên đã tự khôi phục; đây là lưới an toàn khi một bước giữa chừng hỏng.
  const g = await call(TOAN_QUYEN, "GET", `${VC}/chinh-sach-dieu-phoi`);
  if (g.status === 200 && (g.body.current.acceptWaitMinutes !== 10 || g.body.current.autoConfirmTransfer !== true)) await datChinhSach({ acceptWaitMinutes: 10, autoConfirmTransfer: true });
}

// ==== Kiểm định kỳ chuyển khách trên dữ liệu vừa ghi (NT-A5-23) ====
for (const c of CHECKS.filter((x) => ["R-VC-16", "R-VC-31", "R-VC-32", "R-VC-33", "R-VC-34", "R-VC-35", "R-VC-SUA-1"].includes(x.code))) {
  const rows = await sqlRows(c.sql.replace(/\s+/g, " ").trim());
  const n = c.mode === "rows" ? rows.length : Number(Object.values(rows[0] ?? { n: 0 })[0]);
  assert.equal(n, 0, `${c.code} có vi phạm sau kịch bản: ${JSON.stringify(rows).slice(0, 400)}`);
}
console.log("✓ kiểm định kỳ R-VC-16, R-VC-31…35, R-VC-SUA-1 = 0 trên dữ liệu e2e");
