// Vận chuyển lượt 1a (ADR-0040): tài khoản tài xế công ty (quyền DRIVER, vai DRIVER_INTERNAL), cổng, vai hồ sơ đã ngưng, giấy tờ của người (số che, xem đủ số
// có nhật ký không số, CCCD một người, gia hạn chép số, sửa sai chỉ dòng hiện hành), xe (biển số / dùng lại xe — R15), giấy tờ xe, danh sách sắp hết hạn
// (có count — R15), ngưỡng (chỉ Toàn quyền, khôi phục 30 ở `finally`), và LỚP CSDL trên D1 THẬT (local): SQL gõ tay bị trigger / chỉ mục chặn (tiêu chí
// nghiệm thu 13 — node:sqlite đã thử ở src/migrations-*.test.ts, đây là D1). Dữ liệu độc nhất theo lần chạy (SĐT ngẫu nhiên, biển số có Date.now()).
// Mọi số giấy tờ là số GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, login, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

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

console.log("E2E VAN CHUYEN OK");
