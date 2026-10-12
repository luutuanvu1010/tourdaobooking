// Vận chuyển lượt 1a (ADR-0040): tài khoản tài xế công ty (quyền DRIVER, vai DRIVER_INTERNAL), cổng, vai hồ sơ đã ngưng, giấy tờ của người (số che, xem đủ số
// có nhật ký không số, CCCD một người, gia hạn chép số, sửa sai chỉ dòng hiện hành), xe (biển số / dùng lại xe — R15), giấy tờ xe, danh sách sắp hết hạn
// (có count — R15), ngưỡng (chỉ Toàn quyền, khôi phục 30 ở `finally`), và LỚP CSDL trên D1 THẬT (local): SQL gõ tay bị trigger / chỉ mục chặn (tiêu chí
// nghiệm thu 13 — node:sqlite đã thử ở src/migrations-*.test.ts, đây là D1). Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số có Date.now()).
// Mọi số giấy tờ là số GIẢ. Mục 11 (ADR-0097): ba kịch bản sửa sai trên xe đang chạy — mở cửa sổ xuất bến 48 giờ rồi khôi phục giá trị cũ ở cuối mục.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, login, moCuaSoXuatBen48Gio, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const duoi = String(Date.now()).slice(-6);
const SO_CCCD = `079${String(Date.now()).slice(-9)}`; // 12 chữ số, GIẢ, độc nhất theo lần chạy
const SO_GPLX = `79${String(Date.now()).slice(-10)}`;
const BIEN = `79E-${duoi.slice(0, 3)}.${duoi.slice(3)}`;
const KHUNG = `E2EKHUNG${duoi}`;

// --- 1. Tài khoản tài xế (đường thật: tạo theo vai) ---
let r = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual(r.body.staff.permissions, ["DRIVER"], "vai 'Tài xế công ty' sinh đúng một quyền Tài xế");
assert.match(r.body.pin, /^\d{6}$/);
const txId = r.body.staff.id;
const txPhone = r.body.staff.phone;
const lg = await login(txPhone, r.body.pin);
assert.equal(lg.status, 200, JSON.stringify(lg.body));
const TX = lg.cookie;
r = await call(TX, "GET", "/api/auth/me");
assert.deepEqual(r.body.staff.permissions, ["DRIVER"]);
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${txId}'`);
console.log("✓ tài khoản Tài xế công ty: 201, quyền đúng [DRIVER], đăng nhập được");

// --- 2. Cổng: tài xế không vào văn phòng / đơn / quản trị; xem được giấy tờ của mình ---
for (const [m, p] of [["GET", "/api/orders"], ["GET", "/api/orders/dashboard"], ["GET", "/api/parties"], ["GET", "/api/van-chuyen/xe"], ["GET", "/api/staff"], ["GET", "/api/dispatch/mine"]]) {
  const x = await call(TX, m, p);
  assert.equal(x.status, 403, `${p}: ${JSON.stringify(x.body)}`);
}
r = await call(TX, "GET", "/api/parties/documents/mine");
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body.documents, []);
console.log("✓ cổng: tài xế 403 ở đơn, Trang chủ, Danh bạ, xe, tài khoản, việc HDV; giấy tờ của mình 200");

// --- 3. Vai hồ sơ đã ngưng không gán mới (Ruling R6) ---
const khac = (await call(ADMIN, "POST", "/api/parties", { kind: "PERSON", fullName: "Người Khác E2E", contacts: [] })).body.party.id;
r = await call(ADMIN, "POST", `/api/parties/${khac}/roles`, { roleTypeCode: "DRIVER" });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "role_type_inactive");
console.log("✓ vai hồ sơ cũ DRIVER đã ngưng: 409 role_type_inactive");

// --- 4. Giấy tờ của người: thêm (số che), Bán hàng 403, tài xế xem của mình (chỉ dòng hiện hành, ngày hết hạn tăng dần) ---
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "CCCD", number: SO_CCCD, expiryDate: vnDate(4000) });
assert.equal(r.status, 201, JSON.stringify(r.body));
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: SO_GPLX, classCode: "D2", expiryDate: vnDate(10) });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.ok(!JSON.stringify(r.body).includes(SO_CCCD) && !JSON.stringify(r.body).includes(SO_GPLX), "thân trả về không có số đầy đủ");
const cccd = r.body.documents.find((d) => d.typeCode === "CCCD");
const gplx = r.body.documents.find((d) => d.typeCode === "GPLX");
assert.equal(cccd.maskedNumber, `••••${SO_CCCD.slice(-4)}`);
assert.equal((await call(SALES, "GET", `/api/parties/${txParty}/documents`)).status, 403, "Bán hàng không xem giấy tờ người khác");
r = await call(TX, "GET", "/api/parties/documents/mine");
assert.deepEqual(r.body.documents.map((d) => [d.typeCode, d.maskedNumber, d.current]), [["GPLX", `••••${SO_GPLX.slice(-4)}`, true], ["CCCD", `••••${SO_CCCD.slice(-4)}`, true]]);
console.log("✓ giấy tờ của người: thêm 201 (số che), Bán hàng 403, tài xế thấy của mình (GPLX gần hạn trước)");

// --- 5. Xem đủ số (ADR-0083 điều 2: chỉ Toàn quyền): Quản trị 403 không số; Toàn quyền đúng số, một dòng nhật ký KHÔNG số ---
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents/${cccd.id}/reveal`);
assert.equal(r.status, 403, JSON.stringify(r.body));
assert.ok(!JSON.stringify(r.body).includes(SO_CCCD.slice(-6)), "403 không lộ số");
r = await call(TOAN_QUYEN, "POST", `/api/parties/${txParty}/documents/${cccd.id}/reveal`);
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.deepEqual(r.body, { number: SO_CCCD });
const [nk] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'party_document_number_viewed' AND target_id = '${txParty}' ORDER BY rowid DESC LIMIT 1`);
assert.equal(nk.detail, "Căn cước công dân (CCCD)");
console.log("✓ xem đủ số: Quản trị 403; Toàn quyền đúng số; nhật ký chỉ tên loại");

// --- 6. CCCD trùng, gia hạn (không gửi số), sửa sai dòng cũ ---
r = await call(ADMIN, "POST", `/api/parties/${khac}/documents`, { typeCode: "CCCD", number: SO_CCCD });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "cccd_taken");
assert.ok(!JSON.stringify(r.body).includes(SO_CCCD.slice(-6)));
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents/${gplx.id}/renew`, { expiryDate: vnDate(12) }); // hạn mới vẫn trong 30 ngày → còn ở danh sách sắp hết hạn (bước 7), ra khỏi danh sách khi ngưỡng 7 (bước 8)
assert.equal(r.status, 201, JSON.stringify(r.body));
const [moi] = await sqlRows(`SELECT id, number_key FROM pty_person_document WHERE previous_id = '${gplx.id}' AND voided_at IS NULL`);
assert.equal(moi.number_key, SO_GPLX, "gia hạn không gửi số → chép số dòng trước");
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents/${gplx.id}/correct`, { reason: "SAI_NGAY_HET_HAN", value: vnDate(11), expectedUpdatedAt: gplx.updatedAt });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "document_not_current");
console.log("✓ CCCD trùng 409 cccd_taken (không số); gia hạn chép số; sửa sai dòng cũ 409");

// --- 7. Xe: thêm, trùng biển, ngừng + dùng lại xe khi biển đã có chủ (R15), giấy tờ xe, danh sách sắp hết hạn (có count) ---
r = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: BIEN, chassisNumber: KHUNG, name: "Xe E2E", passengerCapacity: 15 });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xe1 = r.body.vehicle;
r = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: BIEN.replace(/[.\-]/g, " "), chassisNumber: `${KHUNG}B`, name: "Xe E2E trùng", passengerCapacity: 15 });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.deepEqual(r.body.error, { code: "vehicle_plate_taken", message: "Biển số này đang dùng cho xe khác." });
r = await call(ADMIN, "PUT", `/api/van-chuyen/xe/${xe1.id}`, { plateNumber: BIEN, chassisNumber: KHUNG, name: "Xe E2E", modelYear: null, passengerCapacity: 15, status: "retired", expectedUpdatedAt: xe1.updatedAt });
assert.equal(r.status, 200, JSON.stringify(r.body));
const xe1Ngung = r.body.vehicle;
r = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: BIEN, chassisNumber: `${KHUNG}C`, name: "Xe E2E mới", passengerCapacity: 15 });
assert.equal(r.status, 201, JSON.stringify(r.body));
const xe2 = r.body.vehicle;
r = await call(ADMIN, "PUT", `/api/van-chuyen/xe/${xe1.id}`, { plateNumber: BIEN, chassisNumber: KHUNG, name: "Xe E2E", modelYear: null, passengerCapacity: 15, status: "active", expectedUpdatedAt: xe1Ngung.updatedAt });
assert.equal(r.status, 409, JSON.stringify(r.body));
assert.equal(r.body.error.code, "vehicle_plate_taken", "dùng lại xe khi biển đã thuộc xe khác chưa ngừng (R15 điểm 1)");
r = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xe2.id}/giay-to`, { typeCode: "INSPECTION", number: "KD-E2E-1", expiryDate: vnDate(5) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const dup = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xe2.id}/giay-to`, { typeCode: "INSPECTION", number: "KD-E2E-2", expiryDate: vnDate(300) });
assert.equal(dup.status, 409, JSON.stringify(dup.body));
assert.equal(dup.body.error.code, "document_type_exists", "ADR-0056 VK3-B: xe đã có Kiểm định đang dùng → dùng Gia hạn");
r = await call(ADMIN, "GET", "/api/van-chuyen/sap-het-han");
assert.equal(r.status, 200, JSON.stringify(r.body));
const cua = (items) => items.filter((i) => i.targetId === xe2.id || i.targetId === txParty).map((i) => [i.kind, i.typeName]);
assert.deepEqual(cua(r.body.items), [["vehicle", "Kiểm định"], ["person", "Giấy phép lái xe"]]);
assert.equal(r.body.count, r.body.items.length, "R15 điểm 2: count cho huy hiệu menu");
assert.ok(!JSON.stringify(r.body).includes(SO_GPLX) && !JSON.stringify(r.body).includes(SO_CCCD), "danh sách không số");
console.log("✓ xe: thêm 201, trùng biển 409 vehicle_plate_taken, dùng lại xe khi biển có chủ 409; giấy tờ xe; danh sách sắp hết hạn gộp xe + tài xế, có count");

// --- 8. Ngưỡng: Quản trị 403; Toàn quyền đổi 7 → hết GPLX (dòng hiện hành hết hạn sau 12 ngày), còn Kiểm định (5 ngày); khôi phục 30 ---
try {
  r = await call(ADMIN, "POST", "/api/van-chuyen/nguong-het-han", { warnDays: 7 });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/nguong-het-han", { warnDays: 7 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(ADMIN, "GET", "/api/van-chuyen/sap-het-han");
  assert.equal(r.body.warnDays, 7);
  assert.deepEqual(cua(r.body.items), [["vehicle", "Kiểm định"]]);
  r = await call(TX, "GET", "/api/parties/documents/mine");
  assert.equal(r.body.warnDays, 7, "giấy tờ của tài xế dùng CÙNG mốc (ADR-0040 D1)");
} finally {
  await new Promise((res) => setTimeout(res, 5)); // valid_from_at duy nhất theo mili-giây
  const kp = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/nguong-het-han", { warnDays: 30 });
  assert.equal(kp.status, 200, `khôi phục ngưỡng 30: ${JSON.stringify(kp.body)}`);
}
console.log("✓ ngưỡng: Quản trị 403; Toàn quyền đổi 7 → danh sách đổi theo; khôi phục 30 (dòng mới)");

// --- 9. Nhật ký không chứa số giấy tờ ---
for (const so of [SO_CCCD, SO_GPLX, "KD-E2E-1"]) {
  const [{ n }] = await sqlRows(`SELECT count(*) AS n FROM audit_log WHERE detail LIKE '%${so}%'`);
  assert.equal(n, 0, `nhật ký chứa ${so}`);
}
console.log("✓ nhật ký không chứa số giấy tờ");

// --- 10. LỚP CSDL trên D1 THẬT (local): SQL gõ tay đi vòng máy chủ vẫn bị trigger / chỉ mục chặn (tiêu chí nghiệm thu 13) ---
await assert.rejects(sql(`DELETE FROM pty_person_document WHERE id = '${cccd.id}'`), /person_document_no_delete/);
await assert.rejects(sql(`UPDATE pty_person_document SET expiry_date = '2099-01-01' WHERE id = '${gplx.id}'`), /person_document_superseded/);
await assert.rejects(
  sql(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, created_at, updated_at)
       VALUES ('e2e-cccd-${duoi}', '${khac}', 'CCCD', '${SO_CCCD}', '${SO_CCCD}', '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z')`),
  /person_document_cccd_other_person/,
);
await assert.rejects(
  sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, name, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
       SELECT 'e2e-xe-${duoi}', plate_number, plate_key, 'Xe trùng', 15, owner_party_id, 'active', '2026-09-28', '2026-09-28T00:00:00.000Z', '2026-09-28T00:00:00.000Z'
       FROM vc_vehicle WHERE id = '${xe2.id}'`),
  /UNIQUE constraint failed: vc_vehicle\.plate_key/,
);
await assert.rejects(sql(`DELETE FROM vc_vehicle WHERE id = '${xe1.id}'`), /vehicle_no_delete/);
await assert.rejects(sql("UPDATE vc_expiry_policy SET warn_days = 5"), /expiry_policy_append_only/);
console.log("✓ D1 local: xoá giấy tờ, sửa đè dòng đã gia hạn, CCCD của người khác, biển số trùng, xoá xe, sửa chính sách — đều bị CSDL chặn");

// --- 11. ADR-0097 (gói A1, V3-B): sửa sai trên xe đang chạy bằng lô điều chỉnh có lý do — ba kịch bản của ADR, API thật trên D1 local ---
// Chuyến NGÀY MAI + cửa sổ 48 giờ (ADR-0096 Đ2) để xuất bến ngay được. Tài xế công ty mới, xe 15 chỗ đủ Kiểm định + Bảo hiểm. Tên, SĐT GIẢ.
await ensureFakeCatalog();
const cuaSoCu = await moCuaSoXuatBen48Gio(); // khôi phục ở cuối mục (bảng chính sách CHỈ THÊM — thêm dòng giá trị cũ)
const KE_TOAN = await session(ACCOUNTS.accountant);
const uuid = () => crypto.randomUUID();
const NGAY = vnDate(1);
const AT = new Date().toISOString();
const tk = await call(TOAN_QUYEN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `Điều Chỉnh E2E ${duoi}`, phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(tk.status, 201, JSON.stringify(tk.body));
const lgDc = await login(tk.body.staff.phone, tk.body.pin);
assert.equal(lgDc.status, 200, JSON.stringify(lgDc.body));
const TXDC = lgDc.cookie;
const [{ party_id: txDcParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${tk.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txDcParty}/documents`, { typeCode: "GPLX", number: `76${String(Date.now()).slice(-9)}${Math.floor(Math.random() * 10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: chuCty }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
const xeDc = uuid();
await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
  VALUES ('${xeDc}', '79K-${duoi.slice(0, 3)}.${duoi.slice(3)}', '79K${duoi}', 'E2EDIEUCHINH${duoi}', 'E2EDIEUCHINH${duoi}', 'Xe điều chỉnh E2E', 2022, 15, '${chuCty}', 'active', '2026-09-01', '${AT}', '${AT}')`);
for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
  await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${xeDc}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
}
const LOC_TRA = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const donDc = async (gio, noi, ten) => {
  const o = await call(SALES, "POST", "/api/orders", orderInput({
    customerName: "Liên Hệ Điều Chỉnh E2E", customerPhone: "0913579248",
    services: [catalogService({ pax: { adult: ten.length }, departDate: NGAY, legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: gio, pickupLocationId: null, pickupPlace: `${noi} ${duoi}`, dropoffLocationId: LOC_TRA, dropoffPlace: "" }] })],
    passengers: ten.map((t, i) => ({ fullName: t, birthYear: 1970 + i, paxCode: null })),
  }));
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal((await call(SALES, "POST", `/api/orders/${o.body.order.id}/status`, { status: "confirmed" })).status, 200);
  return { code: o.body.order.orderCode, legId: o.body.order.services[0].legs[0].id };
};
const dcA = await donDc("10:00", "Khách sạn Điều Chỉnh A", ["Khách Điều Chỉnh A1", "Khách Điều Chỉnh A2"]);
const dcB = await donDc("10:30", "Khách sạn Điều Chỉnh B", ["Khách Điều Chỉnh B1"]);
// Chuyến ĐÚNG (09:30, hai đơn) và chuyến KHÁC cùng tài xế (06:00, không khách) — tài xế bấm nhầm chuyến 06:00.
let cDung = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xeDc, taiXePartyId: txDcParty, batDau: { ngay: NGAY, gio: "09:30" }, ketThuc: { ngay: NGAY, gio: "12:00" } });
assert.equal(cDung.status, 201, JSON.stringify(cDung.body));
const idDung = cDung.body.chuyen.id;
cDung = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idDung}/phan-bo`, { version: cDung.body.chuyen.version, requestId: uuid(), chang: [{ legId: dcA.legId, soSuat: 2 }, { legId: dcB.legId, soSuat: 1 }] });
assert.equal(cDung.status, 200, JSON.stringify(cDung.body));
const cNham = await call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xeDc, taiXePartyId: txDcParty, batDau: { ngay: NGAY, gio: "06:00" }, ketThuc: { ngay: NGAY, gio: "07:00" } });
assert.equal(cNham.status, 201, JSON.stringify(cNham.body));
const idNham = cNham.body.chuyen.id;
const chiTietVp = async (id) => (await call(SALES, "GET", `/api/van-chuyen/chuyen/${id}`)).body;

// (a) HT-03: xuất bến nhầm → thu hồi → xuất bến chuyến đúng
r = await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idNham}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
r = await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 409, `một tài xế một chuyến đang chạy: ${JSON.stringify(r.body)}`);
const thanThuHoi = async () => ({ version: (await chiTietVp(idNham)).chuyen.version, requestId: uuid(), lyDo: "DIEU_CHINH_BAM_NHAM" });
assert.equal((await call(KE_TOAN, "POST", `/api/van-chuyen/chuyen/${idNham}/thu-hoi-xuat-ben`, await thanThuHoi())).status, 403, "Kế toán");
assert.equal((await call(TXDC, "POST", `/api/van-chuyen/chuyen/${idNham}/thu-hoi-xuat-ben`, await thanThuHoi())).status, 403, "tài xế");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idNham}/thu-hoi-xuat-ben`, { ...(await thanThuHoi()), lyDo: "BAO_HUY_KHONG_DI" });
assert.equal(r.status, 400, `lý do ngoài nhóm Điều chỉnh: ${JSON.stringify(r.body)}`);
const thanTh = await thanThuHoi();
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idNham}/thu-hoi-xuat-ben`, thanTh);
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.deepEqual([r.body.chuyen.trangThai, r.body.chuyen.xuatBen], ["PLANNED", null]);
assert.equal((await call(SALES, "POST", `/api/van-chuyen/chuyen/${idNham}/thu-hoi-xuat-ben`, thanTh)).status, 200, "gửi lại cùng requestId → kết quả cũ");
const [thDb] = await sqlRows(`SELECT t.status, t.departed_at, (SELECT count(*) FROM vc_trip_event e WHERE e.trip_id = t.id AND e.kind = 'DEPARTURE_REVOKED' AND e.reason_code = 'DIEU_CHINH_BAM_NHAM') AS n FROM vc_trip t WHERE t.id = '${idNham}'`);
assert.deepEqual([thDb.status, thDb.departed_at, thDb.n], ["PLANNED", null, 1]);
r = await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/xuat-ben`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "RUNNING");
console.log("✓ ADR-0097 HT-03: xuất bến nhầm → Kế toán / tài xế 403, lý do ngoài nhóm 400; văn phòng thu hồi 201 (chuyến về chưa chạy, lặp → 200, một sự kiện có lý do); xuất bến chuyến đúng 200");

// (b) HT-04: đã đón nhầm → điều chỉnh thành vắng
let ct = await chiTietVp(idDung);
const suatA = ct.suat.filter((s) => s.loai === "PASSENGER" && s.maDon === dcA.code);
const suatBDc = ct.suat.find((s) => s.loai === "PASSENGER" && s.maDon === dcB.code);
assert.equal(suatA.length, 2);
const diemDonA = suatA[0].diemLen;
const diemDonB = suatBDc.diemLen;
const diemTra = suatA[0].diemXuong;
assert.equal(suatBDc.diemXuong, diemTra, "hai đơn chung một điểm trả");
assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/diem/${diemDonA}/da-toi`, { requestId: uuid() })).status, 200);
for (const s of suatA) assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/phan-bo/${s.id}/don`, { requestId: uuid() })).status, 200);
r = await call(TXDC, "POST", `/api/van-chuyen/chuyen/${idDung}/phan-bo/${suatA[0].id}/dieu-chinh`, { version: (await chiTietVp(idDung)).chuyen.version, requestId: uuid(), trangThai: "NO_SHOW", lyDo: "DIEU_CHINH_BAM_NHAM" });
assert.equal(r.status, 403, "tài xế không có route điều chỉnh");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idDung}/phan-bo/${suatA[0].id}/dieu-chinh`, { version: (await chiTietVp(idDung)).chuyen.version, requestId: uuid(), trangThai: "NO_SHOW", lyDo: "DIEU_CHINH_BAM_NHAM" });
assert.equal(r.status, 201, JSON.stringify(r.body));
assert.doesNotMatch(JSON.stringify(r.body), /Khách Điều Chỉnh|0913579248/, "phản hồi lệnh ghi không kèm tên / SĐT");
const thayA1 = r.body.suat.find((s) => s.loai === "PASSENGER" && s.maDon === dcA.code && !suatA.some((x) => x.id === s.id));
assert.equal(thayA1.trangThai, "NO_SHOW");
const [a1Db] = await sqlRows(`SELECT (SELECT close_reason FROM vc_trip_allocation WHERE id = '${suatA[0].id}') AS dong, (SELECT corrects_allocation_id FROM vc_trip_allocation WHERE id = '${thayA1.id}') AS tro`);
assert.deepEqual([a1Db.dong, a1Db.tro], ["REMOVED", suatA[0].id]);
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idDung}/thu-hoi-xuat-ben`, { version: (await chiTietVp(idDung)).chuyen.version, requestId: uuid(), lyDo: "DIEU_CHINH_BAM_NHAM" });
assert.deepEqual([r.status, r.body.error?.code], [409, "da_co_tien_do"], "đã đón khách → không thu hồi xuất bến được");
console.log("✓ ADR-0097 HT-04: Đã đón nhầm → văn phòng điều chỉnh thành Vắng 201 (tài xế 403; suất cũ đóng, suất thay thế trỏ về; không tên); đã có tiến độ → thu hồi 409");

// (c) HT-04: khách huỷ nhầm → điều chỉnh thành đã đón → đã trả → kết thúc
assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/diem/${diemDonB}/da-toi`, { requestId: uuid() })).status, 200);
assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/phan-bo/${suatBDc.id}/khach-huy`, { requestId: uuid() })).status, 200);
r = await call(ADMIN, "POST", `/api/van-chuyen/chuyen/${idDung}/phan-bo/${suatBDc.id}/dieu-chinh`, { version: (await chiTietVp(idDung)).chuyen.version, requestId: uuid(), trangThai: "BOARDED", lyDo: "DIEU_CHINH_KHACH_DOI_Y" });
assert.equal(r.status, 201, JSON.stringify(r.body));
const thayB1 = r.body.suat.find((s) => s.loai === "PASSENGER" && s.maDon === dcB.code);
assert.deepEqual([thayB1.trangThai, thayB1.id === suatBDc.id], ["BOARDED", false]);
assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/diem/${diemTra}/da-toi`, { requestId: uuid() })).status, 200);
for (const id of [suatA[1].id, thayB1.id]) assert.equal((await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/phan-bo/${id}/tra`, { requestId: uuid() })).status, 200, id);
r = await call(TXDC, "POST", `/api/van-chuyen/cuoc-cua-toi/${idDung}/ket-thuc`, { requestId: uuid() });
assert.equal(r.status, 200, JSON.stringify(r.body));
assert.equal(r.body.chuyen.trangThai, "ENDED");
const [ev] = await sqlRows(`SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = '${idDung}' AND kind = 'CORRECTION'`);
assert.equal(ev.n, 2, "hai lô điều chỉnh, mỗi lô một sự kiện");
const [nkDc] = await sqlRows(`SELECT count(*) AS n, sum(CASE WHEN detail LIKE '%Khách Điều Chỉnh%' OR detail LIKE '%0913579248%' THEN 1 ELSE 0 END) AS lo FROM audit_log WHERE target_id IN ('${idDung}', '${idNham}') AND action IN ('trip_allocation_corrected', 'trip_departure_revoked')`);
assert.deepEqual([nkDc.n, nkDc.lo], [3, 0], "ba dòng nhật ký điều chỉnh / thu hồi, không tên, không SĐT");
r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${idNham}/huy`, { version: (await chiTietVp(idNham)).chuyen.version, requestId: uuid(), lyDo: "HUY_KHAC" });
console.log(`✓ ADR-0097 HT-04: Khách huỷ nhầm → Quản trị điều chỉnh thành Đã đón 201 → tài xế trả khách → Kết thúc 200; nhật ký không tên / SĐT; dọn chuyến bấm nhầm: ${r.status}`);
{
  const cs = (await call(TOAN_QUYEN, "GET", "/api/van-chuyen/chinh-sach-dieu-phoi")).body.current;
  await new Promise((res) => setTimeout(res, 5)); // valid_from_at duy nhất theo mili-giây
  const kp = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", {
    minLeadMinutes: cs.minLeadMinutes, warnLeadMinutes: cs.warnLeadMinutes, restMinutes: cs.restMinutes, requireManifest: cs.requireManifest,
    proxyBackdateMaxMinutes: cs.proxyBackdateMaxMinutes, dutyDayMaxMinutes: cs.dutyDayMaxMinutes, tripNoBreakMaxMinutes: cs.tripNoBreakMaxMinutes, departureWindowMinutes: cuaSoCu, refuseLeadMinutes: cs.refuseLeadMinutes, officePhone: cs.officePhone,
  });
  assert.equal(kp.status, 201, `khôi phục cửa sổ xuất bến: ${JSON.stringify(kp.body)}`);
}

console.log("E2E VAN CHUYEN OK");
