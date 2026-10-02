// Khung bận của xe — "Lịch xe bận" (ADR-0055 VK2-A; kế hoạch Đợt 3 Task 6–7) trên API THẬT (wrangler dev, D1 local tạm):
//   (1) cổng + ô: Bán hàng, Kế toán → 403 ở route xe/:id/ban và trang tuần ban-xe; Quản trị đọc được, có 4 lý do xe bận;
//   (2) ADR tiêu chí 1 lớp route: khung chồng chuyến chưa huỷ → 409 khung_ban_chong_chuyen, liệt kê mã chuyến, không tên khách / SĐT;
//   (3) huỷ chuyến → ghi lại → 201; nhật ký có biển số, không SĐT;
//   (4) ADR tiêu chí 2 trên D1 thật: chèn tay chuyến chồng khung → lc03_unavailable; tạo chuyến qua route vào khung → 409 "lịch xe bận"; dời giờ chuyến khác
//       vào khung → 409;
//   (5) khung 23:00 D → 07:00 D+1 ghi được (nửa đêm VN); lịch chung của Kế toán (trip.view) có dải bận ở D và D+1, không ở D+2;
//   (6) Review Focus 3: rút version sai → 409; rút đúng → 200; rút lần hai → 409; đúng một nhật ký;
//   (7) CSDL: sửa / xoá khung → chặn; khung DRIVER → unavailability_driver_closed;
//   (7b) trang tuần: khung qua nửa đêm Chủ nhật → thứ Hai có ở CẢ hai tuần; `chuyen` chỉ khoá danh sách trắng;
//   (8) giờ lái: tài xế đã có hai chuyến 4 giờ 30 cùng ngày → tạo chuyến thứ ba 201 kèm `canhBaoLenh` "Tài xế lái quá giờ tối đa trong ngày".
// Khôi phục: rút mọi khung còn mở của các xe thử ở `finally` (xe dùng một lần). Dữ liệu độc nhất theo lần chạy. Tên khách, số giấy tờ là GIẢ.
import assert from "node:assert/strict";
import { ACCOUNTS, call, catalogService, ensureFakeCatalog, orderInput, randomPhone, session, sql, sqlRows, vnDate } from "./lib.mjs";

await ensureFakeCatalog();
const ADMIN = await session(ACCOUNTS.admin);
const TAO_TK = await session(ACCOUNTS.superAdmin);
const SALES = await session(ACCOUNTS.salesA);
const ACC = await session(ACCOUNTS.accountant);
const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
const D = vnDate(3);
const D1 = vnDate(4);
const D2 = vnDate(5);
const duoi = String(Date.now()).slice(-6);
const uuid = () => crypto.randomUUID();
const AT = new Date().toISOString();
const than = (ngay, tu, den, ngayDen = ngay, lyDo = "BAN_XE_BAO_DUONG") => ({ batDau: { ngay, gio: tu }, ketThuc: { ngay: ngayDen, gio: den }, lyDo });
let r;

// --- Nền: tài xế công ty + hai xe 15 chỗ có Kiểm định + Bảo hiểm (khuôn tests/e2e/dieu-phoi.mjs) ---
r = await call(TAO_TK, "POST", "/api/staff", { taoHoSoMoi: true, fullName: "Tài Xế Lịch Bận E2E", phone: randomPhone(), roles: ["DRIVER_INTERNAL"] });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: txParty }] = await sqlRows(`SELECT party_id FROM staff WHERE id = '${r.body.staff.id}'`);
r = await call(ADMIN, "POST", `/api/parties/${txParty}/documents`, { typeCode: "GPLX", number: `79${String(Date.now()).slice(-10)}`, classCode: "D1", expiryDate: vnDate(400) });
assert.equal(r.status, 201, JSON.stringify(r.body));
const [{ party_id: chu }] = await sqlRows("SELECT party_id FROM v_pty_owner_company");
async function taoXe(hau) {
  const id = uuid();
  await sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '79K-${duoi.slice(0, 3)}.${hau}${duoi.slice(4)}', '79K${duoi}${hau}', 'E2EKB${duoi}${hau}', 'E2EKB${duoi}${hau}', 'Xe lịch bận E2E', 2021, 15, '${chu}', 'active', '2026-09-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    await sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${uuid()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
}
const xeId = await taoXe("1");
const xe2 = await taoXe("2");
const xe3 = await taoXe("3");
const [{ plate_number: bien }] = await sqlRows(`SELECT plate_number FROM vc_vehicle WHERE id = '${xeId}'`);
const taoChuyen = (xe, ngay, bd, kt, ngayKt = ngay) =>
  call(SALES, "POST", "/api/van-chuyen/chuyen", { requestId: uuid(), xeId: xe, taiXePartyId: txParty, batDau: { ngay, gio: bd }, ketThuc: { ngay: ngayKt, gio: kt } });

try {
  // --- (1) cổng + ô ---
  for (const s of [SALES, ACC]) {
    assert.equal((await call(s, "GET", `/api/van-chuyen/xe/${xeId}/ban`)).status, 403);
    assert.equal((await call(s, "POST", `/api/van-chuyen/xe/${xeId}/ban`, than(D, "08:00", "17:00"))).status, 403);
    assert.equal((await call(s, "GET", `/api/van-chuyen/ban-xe?tu=${D}`)).status, 403);
  }
  r = await call(ADMIN, "GET", `/api/van-chuyen/xe/${xeId}/ban`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.lyDo.map((l) => l.label), ["Bảo dưỡng", "Đăng kiểm", "Sửa chữa", "Khác"]);
  console.log("✓ (1) Bán hàng, Kế toán → 403 ở lịch xe bận (một xe + trang tuần); Quản trị đọc được 4 lý do xe bận");

  // --- (2) chồng chuyến → 409 lớp route ---
  r = await taoChuyen(xeId, D, "09:00", "11:00");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const cx = r.body.chuyen;
  r = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xeId}/ban`, than(D, "08:00", "17:00"));
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal(r.body.error.code, "khung_ban_chong_chuyen");
  assert.equal(r.body.error.chuyen[0].ma, cx.ma);
  assert.doesNotMatch(JSON.stringify(r.body), /Khách|09\d{8}/);
  console.log(`✓ (2) ghi khung 08:00–17:00 chồng ${cx.ma} → 409 khung_ban_chong_chuyen (chỉ mã chuyến + giờ)`);

  // --- (3) huỷ chuyến → ghi lại 201 + nhật ký ---
  r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${cx.id}/huy`, { version: cx.version, requestId: uuid(), lyDo: "HUY_KHAC" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xeId}/ban`, than(D, "08:00", "17:00"));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const k1 = r.body.dangCo.find((k) => k.lyDo === "Bảo dưỡng");
  const [nk] = await sqlRows(`SELECT detail FROM audit_log WHERE action = 'vehicle_unavailability_added' AND target_id = '${xeId}' ORDER BY rowid DESC LIMIT 1`);
  assert.ok(nk.detail.startsWith(`xe ${bien}: bận 08:00 `), nk.detail);
  assert.doesNotMatch(nk.detail, /09\d{8}/);
  console.log("✓ (3) huỷ chuyến → ghi khung 201; nhật ký có biển số + giờ VN + lý do, không SĐT");

  // --- (4) ADR tiêu chí 2 trên D1 thật ---
  const ms = (ngay, gio) => Date.parse(`${ngay}T${gio}:00+07:00`);
  await assert.rejects(
    sql(`INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id, created_at, updated_at)
      VALUES ('${uuid()}', 'CX-E2E-KB${duoi}', '${xeId}', '${chu}', '${D}', ${ms(D, "10:00")}, ${ms(D, "11:00")}, ${ms(D, "10:00")}, 30, '${uuid()}', '${AT}', '${AT}')`),
    /lc03_unavailable/,
  );
  r = await taoChuyen(xeId, D, "10:00", "11:00");
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.ok(r.body.error.lyDo.some((l) => l.ma === "TRUNG_GIO_XE" && /lịch xe bận/.test(l.loiNhan)), JSON.stringify(r.body));
  console.log("✓ (4) D1 thật: chèn tay chuyến chồng khung → trigger lc03_unavailable; tạo qua route → 409 'lịch xe bận' (lớp máy chủ nói trước)");

  // --- (5) khung qua nửa đêm VN ---
  r = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xe2}/ban`, than(D, "23:00", "07:00", D1, "BAN_XE_SUA_CHUA"));
  assert.equal(r.status, 201, JSON.stringify(r.body));
  // Dời giờ một chuyến khác vào khung → 409; rồi huỷ chuyến đó (không góp giờ lái cho bước 8).
  r = await taoChuyen(xe2, D, "20:00", "21:00");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const doi = r.body.chuyen;
  r = await call(SALES, "PUT", `/api/van-chuyen/chuyen/${doi.id}`, { version: doi.version, requestId: uuid(), batDau: { ngay: D, gio: "22:30" }, ketThuc: { ngay: D, gio: "23:30" } });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.ok(r.body.error.lyDo.some((l) => /lịch xe bận/.test(l.loiNhan)), JSON.stringify(r.body));
  r = await call(SALES, "POST", `/api/van-chuyen/chuyen/${doi.id}/huy`, { version: doi.version, requestId: uuid(), lyDo: "HUY_KHAC" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  // Lịch chung của Kế toán (trip.view — ADR-0055 A4): dải bận ở D và D+1, không ở D+2; danh sách trắng.
  for (const [ngay, co] of [[D, true], [D1, true], [D2, false]]) {
    r = await call(ACC, "GET", `/api/van-chuyen/lich?ngay=${ngay}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    const cua = r.body.khungBanXe.filter((k) => k.xeId === xe2);
    assert.equal(cua.length > 0, co, `${ngay}: ${JSON.stringify(r.body.khungBanXe)}`);
    for (const k of r.body.khungBanXe) assert.deepEqual(Object.keys(k).sort(), ["batDau", "bienSo", "id", "ketThuc", "lyDo", "xeId"]);
  }
  console.log("✓ (5) khung 23:00 D → 07:00 D+1 ghi được; dời giờ chuyến vào khung → 409; Kế toán thấy dải bận ở D, D+1, không ở D+2");

  // --- (6) rút ---
  const url = `/api/van-chuyen/xe/${xeId}/ban/${k1.id}/rut`;
  r = await call(ADMIN, "POST", url, { version: k1.version + 1 });
  assert.equal(r.status, 409);
  assert.equal(r.body.error.code, "khung_ban_vua_doi_route");
  const soRut = async () => (await sqlRows(`SELECT count(*) n FROM audit_log WHERE action = 'vehicle_unavailability_withdrawn' AND target_id = '${xeId}'`))[0].n;
  assert.equal(await soRut(), 0);
  r = await call(ADMIN, "POST", url, { version: k1.version });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.lichSu.find((k) => k.id === k1.id).daRut, true);
  r = await call(ADMIN, "POST", url, { version: k1.version });
  assert.equal(r.status, 409);
  assert.equal(await soRut(), 1);
  console.log("✓ (6) rút: version sai 409; đúng 200 (daRut); rút lần hai 409; đúng một nhật ký");

  // --- (7) CSDL: khung chỉ-thêm; khung tài xế chưa mở ---
  const [{ id: kb2 }] = await sqlRows(`SELECT id FROM vc_unavailability WHERE vehicle_id = '${xe2}' AND withdrawn_at IS NULL`);
  await assert.rejects(sql(`UPDATE vc_unavailability SET start_ms = start_ms + 60000 WHERE id = '${kb2}'`), /vc_unavailability_append_only/);
  await assert.rejects(sql(`DELETE FROM vc_unavailability WHERE id = '${kb2}'`), /vc_unavailability_append_only/);
  await assert.rejects(
    sql(`INSERT INTO vc_unavailability (id, subject, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
      VALUES ('${uuid()}', 'DRIVER', '${txParty}', ${ms(D2, "08:00")}, ${ms(D2, "09:00")}, '${new Date(ms(D2, "08:00")).toISOString()}', '${new Date(ms(D2, "09:00")).toISOString()}', 'BAN_XE_KHAC', '${AT}', '${AT}')`),
    /unavailability_driver_closed|unavailability_reason_group/,
  );
  console.log("✓ (7) D1 thật: sửa / xoá khung bị chặn; ghi khung tài xế bị chặn (chưa mở)");

  // --- (7b) trang tuần: khung Chủ nhật 23:00 → thứ Hai 07:00 có ở hai tuần; chuyen chỉ khoá danh sách trắng ---
  const dow = new Date(`${D}T00:00:00Z`).getUTCDay();
  const cn = vnDate(3 + ((7 - dow) % 7));
  const t2 = new Date(Date.parse(`${cn}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
  r = await call(ADMIN, "POST", `/api/van-chuyen/xe/${xe2}/ban`, than(cn, "23:00", "07:00", t2, "BAN_XE_DANG_KIEM"));
  assert.equal(r.status, 201, JSON.stringify(r.body)); // khung chồng khung cùng xe được phép (K6) — kể cả khi Chủ nhật đầu tiên chính là D
  for (const tu of [cn, t2]) {
    r = await call(ADMIN, "GET", `/api/van-chuyen/ban-xe?tu=${tu}`);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.ok(r.body.khung.some((k) => k.xeId === xe2 && k.lyDo === "Đăng kiểm"), `tuần chứa ${tu}`);
    for (const c of r.body.chuyen) assert.deepEqual(Object.keys(c).sort(), ["batDauMs", "id", "ketThucMs", "ma", "trangThai", "xeId"]);
    assert.doesNotMatch(JSON.stringify(r.body), /Khách|09\d{8}|TD-\d/);
  }
  console.log(`✓ (7b) trang tuần: khung 23:00 ${cn} → 07:00 ${t2} có ở cả hai tuần; chuyến chỉ mã + giờ`);

  // --- (8) giờ lái (ADR-0055 VK2-B — chỉ nhắc): hai chuyến 4 giờ (đúng 8 giờ — chưa nhắc), chuyến thứ ba → 201 + canhBaoLenh ---
  r = await taoChuyen(xe3, D2, "05:00", "09:00");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await taoChuyen(xe3, D2, "09:30", "13:30");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.canhBaoLenh, undefined, "đúng 8 giờ → chưa nhắc");
  r = await taoChuyen(xe3, D2, "14:00", "15:00");
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.deepEqual((r.body.canhBaoLenh ?? []).map((c) => c.nhan), ["Tài xế lái quá giờ tối đa trong ngày"]);
  const ct = await call(SALES, "GET", `/api/van-chuyen/chuyen/${r.body.chuyen.id}`);
  assert.ok(ct.body.canhBao.some((c) => c.loai === "GIO_LAI_VUOT"), JSON.stringify(ct.body.canhBao));
  console.log("✓ (8) giờ lái: chuyến thứ ba (tổng 9 giờ) → 201 kèm nhắc 'Tài xế lái quá giờ tối đa trong ngày'; chi tiết chuyến có cảnh báo cùng loại");

  console.log("E2E KHUNG BAN XE OK");
} finally {
  // Khôi phục: rút mọi khung còn mở của hai xe thử (xe dùng một lần — không ảnh hưởng kịch bản khác).
  for (const x of [xeId, xe2, xe3]) {
    const g = await call(ADMIN, "GET", `/api/van-chuyen/xe/${x}/ban`);
    for (const k of g.body?.dangCo ?? []) await call(ADMIN, "POST", `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`, { version: k.version });
  }
}
