// Tin chuyến + Bảng tin chuyến (ADR-0052 D6; kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-02-tin-bao-chuyen.md Task 7) trên API THẬT
// (wrangler dev có trạm Bảng tin, D1 local tạm), tài khoản tài xế thật (đăng nhập bằng PIN): tạo chuyến → tài xế được xếp nhận tin; đổi tài xế → người cũ
// "không còn lái", người mới "được xếp"; huỷ → chỉ người đang lái nhận; khung Bảng tin đúng 4 khoá tới tài xế đang lái + nhóm điều xe (Kế toán), không tới
// tài xế đã bị đổi ra, không tới tài xế đối tác. Không lộ tên, SĐT khách. Dữ liệu độc nhất theo lần chạy. Tên, số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, moBangTin, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin); // ADR-0071: chỉ Hành chính nhân sự / Toàn quyền tạo tài khoản
const SALES = await session(ACCOUNTS.salesA);
const KT = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(2);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
const KHONG_LO = /Khách Tin Chuyến|0913579246|Liên Hệ Tin Chuyến|\d{8,}/;
const boId = (s) => s.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, "<id>").replace(/\bTD-\d{8}-\d{4,}\b/g, "<ma-don>");
let r;

const taiKhoan = async (roles) => {
  const x = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Tin Chuyến E2E ${roles.join(" ")} ${duoi}`, phone: randomPhone(), roles });
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
  r = await call(ADMIN, "POST", `/api/parties/${t.party}/documents`, { typeCode: "GPLX", number: `77${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 10)}`, classCode: "D1", expiryDate: vnDate(400) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
}
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xeId = uuid();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeId}', '79H-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79H${duoi}', 'E2ETINCH${duoi}', 'E2ETINCH${duoi}', 'Xe tin chuyến E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeId}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}
const o = await call(SALES, "POST", "/api/orders", orderInput({
  customerName: "Liên Hệ Tin Chuyến E2E", customerPhone: "0913579246",
  services: [catalogService({ pax: { adult: 2 }, departDate: D, legs: [{ direction: "OUT", pickupDate: D, pickupTime: "10:00", pickupLocationId: null, pickupPlace: `Khách sạn Tin Chuyến 0913579246 ${duoi}`, dropoffLocationId: LOC, dropoffPlace: "" }] })],
  passengers: [{ fullName: "Khách Tin Chuyến E2E 1", birthYear: 1944, paxCode: null }, { fullName: "Khách Tin Chuyến E2E 2", birthYear: 1945, paxCode: null }],
}));
assert.equal(o.status, 201, JSON.stringify(o.body));
assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);

const hop = async (cookie) => {
  const x = await call(cookie, "GET", "/api/thong-bao?ngan=cua-toi");
  assert.equal(x.status, 200, JSON.stringify(x.body));
  return x.body.tin.filter((t) => t.loai === "chuyen");
};
const cauCua = async (cookie) => (await hop(cookie)).map((t) => t.cau);
const tatCaJson = [];

// --- 1. Tạo chuyến cho TX → TX "Bạn được xếp lái"; Bán hàng (người tạo), Kế toán, Tài xế đối tác không thấy ---
let c = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId, taiXePartyId: TX.party, batDau: { ngay: D, gio: "09:30" }, ketThuc: { ngay: D, gio: "12:00" } });
assert.equal(c.status, 201, JSON.stringify(c.body));
const id = c.body.chuyen.id;
const ma = c.body.chuyen.ma;
c = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { version: c.body.chuyen.version, requestId: uuid(), chang: [{ legId: o.body.order.services[0].legs[0].id, soSuat: 2 }] });
assert.equal(c.status, 200, JSON.stringify(c.body));
const c1 = `chuyến ${ma} ngày ${D.slice(8, 10)}/${D.slice(5, 7)}`;
assert.ok((await cauCua(TX.cookie)).includes(`Bạn được xếp lái ${c1}`), JSON.stringify(await cauCua(TX.cookie)));
for (const [who, ten] of [[SALES, "Bán hàng (người tạo)"], [KT, "Kế toán"], [TXDT.cookie, "Tài xế đối tác"], [TX2.cookie, "tài xế khác"]]) {
  assert.ok(!(await cauCua(who)).some((x) => x.includes(ma)), `${ten} không nhận tin chuyến ${ma}`);
}
console.log("✓ tạo chuyến: tài xế được xếp nhận \"Bạn được xếp lái …\"; người tạo, Kế toán, Tài xế đối tác, tài xế khác không");

// --- 4 (mở trước bước 2–3). Bảng tin: kết nối của TX, TX2, Kế toán, Tài xế đối tác ---
const btTX = await moBangTin(TX.cookie);
const btTX2 = await moBangTin(TX2.cookie);
const btKT = await moBangTin(KT);
const btDT = await moBangTin(TXDT.cookie);
await new Promise((res) => setTimeout(res, 300));
const khungChuyen = (bt) => bt.raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter((x) => x && x.loai === "chuyen" && x.maChuyen === ma);

// --- 2. PUT đổi tài xế sang TX2 → TX "không còn lái", TX2 "được xếp" ---
let v = (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body.chuyen.version;
r = await call(SALES, "PUT", `/api/van-chuyen/chuyen/${id}`, { version: v, requestId: uuid(), taiXePartyId: TX2.party });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.ok((await cauCua(TX.cookie)).includes(`Bạn không còn lái ${c1}`), JSON.stringify(await cauCua(TX.cookie)));
assert.ok((await cauCua(TX2.cookie)).includes(`Bạn được xếp lái ${c1}`), JSON.stringify(await cauCua(TX2.cookie)));
assert.ok(await btTX.cho(() => khungChuyen(btTX).some((x) => x.thayDoi === "sua"), 3000), "TX (bị đổi ra, đúng mốc) nhận khung sửa");
assert.ok(await btTX2.cho(() => khungChuyen(btTX2).some((x) => x.thayDoi === "sua"), 3000), "TX2 nhận khung sửa");
console.log("✓ đổi tài xế: người cũ \"Bạn không còn lái …\", người mới \"Bạn được xếp lái …\"; cả hai nhận khung Bảng tin của lệnh đổi");

// --- 3. Huỷ → chỉ TX2 "đã bị huỷ"; TX không có tin huỷ ---
v = (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body.chuyen.version;
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${id}/huy`, { version: v, requestId: uuid(), lyDo: "HUY_KHAC" });
assert.equal(r.status, 200, JSON.stringify(r.body));
const huy = `${c1.charAt(0).toUpperCase()}${c1.slice(1)} đã bị huỷ`;
assert.ok((await cauCua(TX2.cookie)).includes(huy), JSON.stringify(await cauCua(TX2.cookie)));
assert.ok(!(await cauCua(TX.cookie)).includes(huy), "TX đã bị đổi ra trước khi huỷ — không nhận tin huỷ");
console.log("✓ huỷ: chỉ tài xế đang lái nhận \"… đã bị huỷ\"");

// --- 4. Khung Bảng tin huỷ: TX2 + Kế toán (nhóm điều xe) nhận, đúng 4 khoá; TX (đã bị đổi ra) và Tài xế đối tác không ---
assert.ok(await btTX2.cho(() => khungChuyen(btTX2).some((x) => x.thayDoi === "huy"), 3000), "TX2 nhận khung huỷ");
assert.ok(await btKT.cho(() => khungChuyen(btKT).some((x) => x.thayDoi === "huy"), 3000), "Kế toán (trip.view any — nhóm dieu-xe) nhận khung huỷ");
await new Promise((res) => setTimeout(res, 500));
assert.ok(!khungChuyen(btTX).some((x) => x.thayDoi === "huy"), "TX đã bị đổi ra: không nhận khung huỷ");
assert.deepEqual(btDT.raw.map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter((x) => x && x.loai === "chuyen"), [], "Tài xế đối tác: không khung chuyến nào");
for (const k of [...khungChuyen(btTX2), ...khungChuyen(btKT)]) assert.deepEqual(Object.keys(k).sort(), ["loai", "luc", "maChuyen", "thayDoi"], JSON.stringify(k));
console.log("✓ Bảng tin: khung huỷ tới tài xế đang lái + Kế toán (nhóm điều xe), đúng 4 khoá; không tới tài xế đã bị đổi ra, không tới Tài xế đối tác");

// --- 5. Không lộ: JSON hộp + mọi khung ---
// Chỉ quét tin / khung CHUYẾN — D1 của nhóm e2e dùng chung với kịch bản khác (tin đơn, tin thủ công của họ không thuộc bài này).
for (const who of [TX.cookie, TX2.cookie, SALES, KT, TXDT.cookie]) tatCaJson.push(JSON.stringify((await call(who, "GET", "/api/thong-bao?ngan=tat-ca")).body.tin.filter((x) => x.loai === "chuyen")));
for (const bt of [btTX, btTX2, btKT, btDT]) tatCaJson.push(...bt.raw.filter((x) => x.includes('"loai":"chuyen"')));
assert.ok(tatCaJson.some((s) => s.includes(ma)), "chống bài rỗng: có tin / khung chuyến để quét");
for (const s of tatCaJson) assert.doesNotMatch(boId(s), KHONG_LO, s.slice(0, 300));
for (const bt of [btTX, btTX2, btKT, btDT]) bt.dongLai();
console.log("✓ không lộ: hộp thông báo + khung Bảng tin không tên, không SĐT khách, không dãy ≥ 8 chữ số");
