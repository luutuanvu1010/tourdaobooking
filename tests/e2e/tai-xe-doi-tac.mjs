// Nhà xe đối tác + tài xế đối tác (ADR-0048 D1, D2) trên API THẬT và D1 local: tài khoản vai "Tài xế đối tác" (quyền DRIVER_PARTNER, đứng một mình), cổng,
// giấy tờ của mình (số che), góp ý; LC-1b ở cả năm đường ghi quyền (400, không 500); đổi vai hợp lệ không bị chặn nhầm (5b); LỚP CSDL trên D1 THẬT (tiêu chí
// nghiệm thu 4 — SQL gõ tay bị trigger LC-1 / LC-1b / chủ xe / "Tài xế của" chặn); nhà xe, quan hệ "Tài xế của", xe của nhà xe, danh sách nhà xe; danh sách
// sắp hết hạn có nhãn nhà xe, không số; "Toàn công ty" không tới tài xế đối tác (tin nhóm Tài xế đối tác thì tới). Dữ liệu độc nhất theo lần chạy (SĐT ngẫu
// nhiên, biển số / số giấy tờ có Date.now()). Mọi số giấy tờ là số GIẢ. Hai tin thông báo thu hồi ở `finally`.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ACCOUNTS, call, login, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const duoi = String(Date.now()).slice(-6);
const SO_GPLX = `79${String(Date.now()).slice(-10)}`; // 12 chữ số, GIẢ
const BIEN = `79F-${duoi.slice(0, 3)}.${duoi.slice(3)}`;
const KHUNG = `E2ENHAXE${duoi}`;
const AT = "2026-09-29T00:00:00.000Z";
const openPerms = async (staffId) =>
  (await sqlRows(`SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = '${staffId}' AND valid_to_at IS NULL ORDER BY c`)).map((x) => x.c);
const taoTheoVai = async (roles, as = ADMIN) => {
  const r = await call(as, "POST", "/api/staff", { taoHoSoMoi: true, fullName: `E2E ${roles.join(" ")} ${duoi}`, phone: randomPhone(), roles });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  return r.body;
};

const tinThuHoi = [];
try {
  // --- 1. Tài khoản Tài xế đối tác (đường thật: tạo theo vai) — tiêu chí 9 ---
  const tao = await taoTheoVai(["DRIVER_EXTERNAL"]);
  assert.deepEqual(tao.staff.permissions, ["DRIVER_PARTNER"], "vai 'Tài xế đối tác' sinh đúng một quyền Tài xế đối tác");
  const txId = tao.staff.id;
  const lg = await login(tao.staff.phone, tao.pin);
  assert.equal(lg.status, 200, JSON.stringify(lg.body));
  const TX = lg.cookie;
  assert.deepEqual((await call(TX, "GET", "/api/auth/me")).body.staff.permissions, ["DRIVER_PARTNER"]);
  const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${txId}'`);
  for (const p of ["/api/orders", "/api/orders/dashboard", "/api/parties", "/api/catalog/for-order", "/api/van-chuyen/xe", "/api/van-chuyen/nha-xe"]) {
    const x = await call(TX, "GET", p);
    assert.equal(x.status, 403, `${p}: ${JSON.stringify(x.body)}`);
  }
  let r = await call(TX, "GET", "/api/parties/documents/mine");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(TX, "POST", "/api/feedback", { kind: "BUG", title: "Tài xế đối tác thử góp ý", body: "Góp ý từ tài xế đối tác.", clientRequestId: randomUUID(), context: { path: "/tai-xe" } });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  console.log("✓ tài khoản Tài xế đối tác: 201, quyền đúng [DRIVER_PARTNER]; 403 ở đơn, Trang chủ, Danh bạ, danh mục lập đơn, xe, nhà xe; giấy tờ của mình 200; góp ý 201");

  // --- 2. Tài khoản lai (tiêu chí 5): bốn đường ghi quyền → 400 invalid_input, không 500 ---
  r = await call(ADMIN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Lai Một E2E", phone: randomPhone(), roles: ["TAXI_DRIVER", "DRIVER_EXTERNAL"] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  assert.match(r.body.error.message, /một người chọn một/);
  r = await call(ADMIN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Lai Hai E2E", phone: randomPhone(), permissions: ["DRIVER_PARTNER", "SALES"] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  const cu = await call(ADMIN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Đối Tác Cũ E2E", phone: randomPhone(), permissions: ["PARTNER"] });
  assert.equal(cu.status, 201, JSON.stringify(cu.body));
  r = await call(ADMIN, "PUT", `/api/staff/${cu.body.staff.id}/permissions`, { permissions: ["PARTNER", "DRIVER_PARTNER"] });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  r = await call(ADMIN, "PUT", `/api/staff/${txId}/roles`, { roles: ["DRIVER_EXTERNAL"], adds: ["PARTNER"], reason: "thử lai" });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  for (const [id, want] of [[cu.body.staff.id, ["PARTNER"]], [txId, ["DRIVER_PARTNER"]]]) assert.deepEqual(await openPerms(id), want, "quyền giữ nguyên sau 400");
  console.log("✓ tài khoản lai: POST có vai, POST đường cũ, PUT …/permissions, PUT …/roles → 400 (không 500), quyền giữ nguyên");

  // --- 3. Đổi vai hợp lệ (5b): Tài xế taxi ↔ Tài xế đối tác → 200, đúng một quyền mở ---
  const taxi = await taoTheoVai(["TAXI_DRIVER"]);
  r = await call(ADMIN, "PUT", `/api/staff/${taxi.staff.id}/roles`, { roles: ["DRIVER_EXTERNAL"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(await openPerms(taxi.staff.id), ["DRIVER_PARTNER"]);
  r = await call(ADMIN, "PUT", `/api/staff/${taxi.staff.id}/roles`, { roles: ["TAXI_DRIVER"] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(await openPerms(taxi.staff.id), ["PARTNER"]);
  console.log("✓ 5b: Tài xế taxi → Tài xế đối tác → Tài xế taxi, 200 cả hai chiều, mỗi lần đúng một quyền mở");

  // --- 4. LỚP CSDL trên D1 THẬT (tiêu chí 4): SQL gõ tay đi vòng máy chủ bị trigger chặn ---
  const grant = (staffId, code) =>
    sql(`INSERT INTO stf_permission (id, staff_id, permission_type_code, valid_from_at, created_at, updated_at) VALUES ('e2e-${code}-${staffId.slice(0, 8)}-${duoi}', '${staffId}', '${code}', '${AT}', '${AT}', '${AT}')`);
  await assert.rejects(grant(taxi.staff.id, "DRIVER_PARTNER"), /lc1b_driver_partner_alone/, "(a) đang giữ PARTNER, chèn DRIVER_PARTNER");
  await assert.rejects(grant(txId, "PARTNER"), /lc1b_driver_partner_alone/, "(b) đang giữ DRIVER_PARTNER, chèn PARTNER");
  const [{ id: salesId }] = await sqlRows(`SELECT id FROM staff WHERE phone = '${ACCOUNTS.salesA.phone}'`);
  await assert.rejects(grant(salesId, "DRIVER_PARTNER"), /lc1b_driver_partner_alone/, "(c) SALES có trước, chèn DRIVER_PARTNER");
  const chiDt = await call(ADMIN, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Chỉ Tài Xế Đối Tác E2E", phone: randomPhone(), permissions: ["DRIVER_PARTNER"] });
  assert.equal(chiDt.status, 201, JSON.stringify(chiDt.body));
  await assert.rejects(grant(chiDt.body.staff.id, "SALES"), /lc1b_driver_partner_alone/, "(c) DRIVER_PARTNER có trước (không vai), chèn SALES");
  // (d)(e)(f): tài khoản vai bên ngoài MỚI, CHƯA có quyền nào — dựng bằng SQL (tiêu chí 4, dòng cuối: tránh vướng cả LC-1 lẫn LC-1b).
  const moi = `e2e-dt-${duoi}`;
  await sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('p-${moi}', 'PERSON', 'Tài Xế SQL ${duoi}', 1, '${AT}', '${AT}')`);
  await sql(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('p-${moi}', 'Tài Xế SQL ${duoi}', '${AT}', '${AT}')`); // given_name = display_name (R-N1-3)
  await sql(`INSERT INTO staff (id, full_name, phone, pin_hash, role, active, created_at, party_id) VALUES ('${moi}', '', '${randomPhone()}', 'x', 'sales', 1, '${AT}', 'p-${moi}')`);
  await sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('r-${moi}', 'p-${moi}', 'DRIVER_EXTERNAL', NULL, '2026-09-20', '${AT}', '${AT}')`);
  await assert.rejects(grant(moi, "SALES"), /lc1_external_account_permission/, "(e) vai bên ngoài chèn SALES");
  await assert.rejects(grant(moi, "DRIVER"), /lc1_external_account_permission/, "(f) vai bên ngoài chèn DRIVER (tài xế công ty)");
  await grant(moi, "DRIVER_PARTNER"); // (d) vai bên ngoài chưa có quyền nào chèn DRIVER_PARTNER → được
  assert.deepEqual(await openPerms(moi), ["DRIVER_PARTNER"]);
  console.log("✓ D1 local: LC-1b chặn (a)(b)(c) cả hai chiều; LC-1 mới chặn SALES, DRIVER cho vai bên ngoài; DRIVER_PARTNER được (d)");

  // --- 5. Nhà xe: vai, quan hệ "Tài xế của", xe của nhà xe, danh sách nhà xe; lớp CSDL chủ xe ---
  const tenNhaXe = `Nhà Xe E2E ${duoi}`;
  const nhaXe = (await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: tenNhaXe })).body.party.id;
  r = await call(ADMIN, "POST", `/api/parties/${nhaXe}/roles`, { roleTypeCode: "CARRIER" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await call(ADMIN, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: txParty, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const daiLy = (await call(ADMIN, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: `Đại Lý E2E ${duoi}` })).body.party.id;
  r = await call(ADMIN, "POST", `/api/parties/${nhaXe}/relationships`, { fromPartyId: daiLy, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "drives_for_not_person");
  r = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: BIEN, chassisNumber: KHUNG, name: "Xe Nhà Xe E2E", passengerCapacity: 15, ownerPartyId: nhaXe });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual([r.body.vehicle.ownerName, r.body.vehicle.ownerIsCompany], [tenNhaXe, false]);
  r = await call(ADMIN, "POST", "/api/van-chuyen/xe", { plateNumber: `79G-${duoi.slice(0, 3)}.${duoi.slice(3)}`, chassisNumber: `${KHUNG}B`, name: "Xe Đại Lý", passengerCapacity: 15, ownerPartyId: daiLy });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "vehicle_owner_not_carrier");
  r = await call(ADMIN, "GET", "/api/van-chuyen/nha-xe");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const dong = r.body.carriers.find((c) => c.partyId === nhaXe);
  assert.deepEqual(dong, { partyId: nhaXe, name: tenNhaXe, kind: "ORGANIZATION", vehicleCount: 1, driverCount: 1 });
  await assert.rejects(
    sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, name, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
         VALUES ('e2e-xe-dl-${duoi}', 'SQL-${duoi}', 'SQL${duoi}', 'Xe SQL', 15, '${daiLy}', 'active', '2026-09-29', '${AT}', '${AT}')`),
    /vehicle_owner_not_allowed/,
  );
  await assert.rejects(
    sql(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at)
         VALUES ('e2e-q-${duoi}', '${daiLy}', '${nhaXe}', 'DRIVES_FOR', '2026-09-29', '${AT}', '${AT}')`),
    /party_relationship_drives_for_person/,
  );
  console.log("✓ nhà xe: vai Nhà xe đối tác, Tài xế của (người → nhà xe 201; từ tổ chức 409), xe của nhà xe 201, của hồ sơ thường 409; danh sách nhà xe đúng số xe, số tài xế; SQL gõ tay bị trigger chủ xe / Tài xế của chặn");

  // --- 6. Sắp hết hạn: giấy tờ tài xế đối tác có nhãn nhà xe, thân KHÔNG số; tài xế xem của mình (số che) ---
  r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: SO_GPLX, classCode: "D2", expiryDate: vnDate(9) });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await call(ADMIN, "GET", "/api/van-chuyen/sap-het-han");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const dongTx = r.body.items.filter((i) => i.targetId === txParty);
  assert.equal(dongTx.length, 1, JSON.stringify(r.body.items));
  assert.equal(dongTx[0].ownerLabel, tenNhaXe);
  assert.ok(!JSON.stringify(r.body).includes(SO_GPLX) && !JSON.stringify(r.body).includes(SO_GPLX.slice(-8)), "danh sách sắp hết hạn không có số");
  r = await call(TX, "GET", "/api/parties/documents/mine");
  assert.deepEqual(r.body.documents.map((d) => [d.typeCode, d.maskedNumber]), [["GPLX", `••••${SO_GPLX.slice(-4)}`]]);
  assert.ok(!JSON.stringify(r.body).includes(SO_GPLX), "giấy tờ của mình: số che");
  console.log("✓ sắp hết hạn: dòng tài xế đối tác mang tên nhà xe, không số; tài xế đối tác xem giấy tờ của mình (số che)");

  // --- 7. "Toàn công ty" không tới tài xế đối tác; tin nhóm Tài xế đối tác thì tới (hộp thư — cùng hàm với màn hình khoá) ---
  const gui = async (nguoiNhan) => {
    const x = await call(TOAN_QUYEN, "POST", "/api/thong-bao", { tieuDe: `E2E tài xế đối tác ${duoi} ${JSON.stringify(nguoiNhan)}`, noiDung: "Thử phạm vi nhận tin.", nguoiNhan, quanTrong: false, clientRequestId: randomUUID() });
    assert.equal(x.status, 201, JSON.stringify(x.body));
    tinThuHoi.push(x.body.id);
    return x.body.id;
  };
  const noiBo = await gui("noi-bo");
  const nhom = await gui(["DRIVER_PARTNER"]);
  const hop = (await call(TX, "GET", "/api/thong-bao?ngan=tat-ca")).body.tin.map((t) => t.id);
  assert.ok(!hop.includes(noiBo), "tin Toàn công ty KHÔNG tới tài xế đối tác");
  assert.ok(hop.includes(nhom), "tin nhóm Tài xế đối tác tới");
  const hopQt = (await call(ADMIN, "GET", "/api/thong-bao?ngan=tat-ca")).body.tin.map((t) => t.id);
  assert.ok(hopQt.includes(noiBo) && !hopQt.includes(nhom), "Quản trị nhận tin Toàn công ty, không nhận tin nhóm Tài xế đối tác");
  console.log("✓ thông báo: Toàn công ty không tới tài xế đối tác; nhóm Tài xế đối tác thì tới");
} finally {
  for (const id of tinThuHoi) await call(TOAN_QUYEN, "POST", `/api/thong-bao/${id}/thu-hoi`);
}

console.log("E2E TAI XE DOI TAC OK");
