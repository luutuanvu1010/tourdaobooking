// Chính sách điều phối xe (ADR-0049 D2, D3; kế hoạch mục 1.7 route 9–18, Task A7, TC-2) trên D1 THẬT (local): chính sách điều phối, điều kiện xuất bến,
// hạng bằng (cổng office + ô settings.ops — chỉ Toàn quyền), danh mục lý do (cổng admin + ô admin.manage). Khoá ngoại sang danh mục của parties (hạng bằng,
// loại giấy tờ của người) do CHÍNH D1 giữ → 400, không 500. Lớp CSDL: SQL gõ tay sửa / xoá chính sách, hợp đồng = 1, đóng điều kiện hai lần đều bị chặn.
// Bảng chính sách CHỈ THÊM và mọi kịch bản dùng chung một D1 tạm → `finally` THÊM dòng khôi phục giá trị gieo (360/120/30/có; D2 = 29) và đóng điều kiện
// đã thêm, để kịch bản sau (mốc 6 giờ — A10) không thừa hưởng giá trị thử. Mã lý do theo lần chạy (Date.now()), ngưng ở cuối.
import assert from "node:assert/strict";
import { ACCOUNTS, call, session, sql, sqlRows } from "./lib.mjs";

const ADMIN = await session(ACCOUNTS.admin);
const SALES = await session(ACCOUNTS.salesA);
const TOAN_QUYEN = await session(ACCOUNTS.superAdmin);
const duoi = String(Date.now()).slice(-6);
const MA_LY_DO = `PHA_LE_E2E_${duoi}`;
const cho = () => new Promise((res) => setTimeout(res, 5)); // valid_from_at duy nhất theo mili-giây
const GOC = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true };
const nhatKy = async (action) => (await sqlRows(`SELECT detail, order_id FROM audit_log WHERE action = '${action}' ORDER BY rowid DESC LIMIT 1`))[0];
const dieuKienDaThem = [];

let r;
try {
  // --- 1. Cổng + ô: Bán hàng, Quản trị 403 (ô settings.ops); Toàn quyền đọc bản gieo ---
  for (const [ai, ck] of [["Bán hàng", SALES], ["Quản trị", ADMIN]]) {
    for (const [m, p, body] of [["GET", "/api/van-chuyen/chinh-sach-dieu-phoi"], ["POST", "/api/van-chuyen/chinh-sach-dieu-phoi", GOC], ["GET", "/api/van-chuyen/hang-bang"], ["POST", "/api/van-chuyen/dieu-kien", { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" }]]) {
      r = await call(ck, m, p, body);
      assert.equal(r.status, 403, `${ai} ${m} ${p}: ${JSON.stringify(r.body)}`);
      assert.match(r.body.error.message, /Chỉ người phụ trách hệ thống/);
    }
  }
  r = await call(TOAN_QUYEN, "GET", "/api/van-chuyen/chinh-sach-dieu-phoi");
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.current.requireContract, false);
  console.log(`✓ cổng + ô: Bán hàng, Quản trị 403; Toàn quyền đọc chính sách (mốc hiện ${r.body.current.minLeadMinutes} phút)`);

  // --- 2. Chính sách: thêm bản mới 201 (hiệu lực ngay); thân có ngày hiệu lực / hợp đồng bật → 400 ---
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", { minLeadMinutes: 240, warnLeadMinutes: 60, restMinutes: 45, requireManifest: true });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.current.minLeadMinutes, 240);
  assert.ok(r.body.history.length >= 2, "bản cũ còn trong lịch sử");
  for (const body of [{ ...GOC, validFrom: "2026-01-01" }, { ...GOC, requireContract: true }]) {
    const x = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", body);
    assert.equal(x.status, 400, `${JSON.stringify(body)}: ${JSON.stringify(x.body)}`);
  }
  const nk = await nhatKy("dispatch_policy_changed");
  assert.match(nk.detail, /mốc tối thiểu \d+ → 240 phút/);
  assert.equal(nk.order_id, null);
  console.log("✓ chính sách: Toàn quyền thêm bản 240 phút → 201, hiệu lực ngay; ngày hiệu lực / hợp đồng bật → 400; nhật ký trước → sau");

  // --- 3. Hạng bằng: D2 = 30 → dòng mới, dòng cũ còn; hạng lạ → 400 (khoá ngoại do D1 giữ) ---
  await cho();
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/hang-bang", { classCode: "D2", maxPassengers: 30 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  assert.equal(r.body.current.find((c) => c.classCode === "D2").maxPassengers, 30);
  const d2 = await sqlRows("SELECT max_passengers AS m FROM vc_license_capacity WHERE license_class_code = 'D2' ORDER BY valid_from_at");
  assert.equal(d2[0].m, 29, "dòng gieo 29 còn nguyên");
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/hang-bang", { classCode: "HANG_LA", maxPassengers: 8 });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  console.log("✓ hạng bằng: D2 = 30 → 201, dòng 29 còn nguyên; hạng lạ → 400 (khoá ngoại trên D1)");

  // --- 4. Điều kiện xuất bến: thêm xe / tài xế 201; loại lạ của người → 400 (khoá ngoại D1); đóng 200, lần hai 409 ---
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/dieu-kien", { minCapacity: 16, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const dkXe = r.body.rules.find((x) => x.subject === "VEHICLE" && x.active && x.documentTypeCode === "CONTRACT_BADGE").id;
  dieuKienDaThem.push(dkXe);
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/dieu-kien", { minCapacity: 10, subject: "DRIVER", documentTypeCode: "HEALTH_CHECK" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  dieuKienDaThem.push(r.body.rules.find((x) => x.subject === "DRIVER" && x.active && x.documentTypeCode === "HEALTH_CHECK").id);
  r = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/dieu-kien", { minCapacity: 10, subject: "DRIVER", documentTypeCode: "KHONG_CO_LOAI" });
  assert.equal(r.status, 400, JSON.stringify(r.body));
  r = await call(TOAN_QUYEN, "POST", `/api/van-chuyen/dieu-kien/${dkXe}/dong`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.rules.find((x) => x.id === dkXe).active, false);
  r = await call(TOAN_QUYEN, "POST", `/api/van-chuyen/dieu-kien/${dkXe}/dong`, {});
  assert.equal(r.status, 409, JSON.stringify(r.body));
  assert.equal((await nhatKy("departure_rule_closed")).detail, "điều kiện xuất bến: xe từ 16 người — giấy tờ xe Phù hiệu xe hợp đồng");
  console.log("✓ điều kiện xuất bến: thêm 201; loại giấy tờ lạ → 400 (khoá ngoại D1); đóng 200, lần hai 409");

  // --- 5. Danh mục lý do: Quản trị thêm 201; Bán hàng 403 ở cổng admin; ngưng có mốc 200, mốc cũ 409 ---
  r = await call(ADMIN, "POST", "/api/van-chuyen/ly-do", { code: MA_LY_DO, group: "PHA_LE", label: "Thử e2e" });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  r = await call(SALES, "POST", "/api/van-chuyen/ly-do", { code: `${MA_LY_DO}_B`, group: "PHA_LE", label: "x" });
  assert.equal(r.status, 403, JSON.stringify(r.body));
  assert.equal(r.body.error.message, "Chỉ quản trị viên được thực hiện thao tác này.");
  const moc = (await sqlRows(`SELECT updated_at AS u FROM vc_reason WHERE code = '${MA_LY_DO}'`))[0].u;
  r = await call(ADMIN, "PUT", `/api/van-chuyen/ly-do/${MA_LY_DO}`, { label: "Thử e2e", sortOrder: 9, active: false, expectedUpdatedAt: moc });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  r = await call(ADMIN, "PUT", `/api/van-chuyen/ly-do/${MA_LY_DO}`, { label: "Thử lại", sortOrder: 9, active: true, expectedUpdatedAt: moc });
  assert.equal(r.status, 409, JSON.stringify(r.body));
  console.log("✓ danh mục lý do: Quản trị thêm 201; Bán hàng 403 ở cổng admin; ngưng 200, mốc cũ 409");

  // --- 6. LỚP CSDL trên D1 THẬT (local): SQL gõ tay đi vòng máy chủ vẫn bị chặn ---
  await assert.rejects(sql("UPDATE vc_dispatch_policy SET min_lead_minutes = 0"), /vc_policy_append_only/);
  await assert.rejects(sql("DELETE FROM vc_dispatch_policy"), /vc_policy_append_only/);
  await assert.rejects(
    sql(`INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract, valid_from_at, created_at, updated_at)
         VALUES ('e2e-hd-${duoi}', 360, 120, 30, 1, 1, '2099-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z', '2099-01-01T00:00:00.000Z')`),
    /CHECK constraint failed/,
  );
  await assert.rejects(sql("UPDATE vc_license_capacity SET max_passengers = 99"), /vc_policy_append_only/);
  await assert.rejects(sql(`UPDATE vc_departure_rule SET valid_to_at = '2099-01-01T00:00:00.000Z' WHERE id = '${dkXe}'`), /vc_departure_rule_close_once/);
  await assert.rejects(sql(`DELETE FROM vc_reason WHERE code = '${MA_LY_DO}'`), /vc_reason_no_delete/);
  await assert.rejects(sql(`UPDATE vc_reason SET reason_group = 'HUY_CHUYEN' WHERE code = '${MA_LY_DO}'`), /vc_reason_identity/);
  console.log("✓ D1 local: sửa / xoá chính sách, bật hợp đồng, sửa hạng bằng, đóng điều kiện lần hai, xoá / đổi nhóm lý do — đều bị CSDL chặn");
} finally {
  // Khôi phục cho kịch bản sau (bảng chỉ thêm → thêm dòng mang giá trị gieo; đóng điều kiện còn mở đã thêm).
  await cho();
  const kp = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/chinh-sach-dieu-phoi", GOC);
  assert.equal(kp.status, 201, `khôi phục chính sách: ${JSON.stringify(kp.body)}`);
  await cho();
  const hb = await call(TOAN_QUYEN, "POST", "/api/van-chuyen/hang-bang", { classCode: "D2", maxPassengers: 29 });
  assert.equal(hb.status, 201, `khôi phục D2 = 29: ${JSON.stringify(hb.body)}`);
  for (const id of dieuKienDaThem) {
    const x = await call(TOAN_QUYEN, "POST", `/api/van-chuyen/dieu-kien/${id}/dong`, {});
    assert.ok(x.status === 200 || x.status === 409, `đóng điều kiện ${id}: ${JSON.stringify(x.body)}`);
  }
}
r = await call(TOAN_QUYEN, "GET", "/api/van-chuyen/chinh-sach-dieu-phoi");
assert.deepEqual([r.body.current.minLeadMinutes, r.body.current.warnLeadMinutes, r.body.current.restMinutes, r.body.current.requireManifest], [360, 120, 30, true]);
r = await call(TOAN_QUYEN, "GET", "/api/van-chuyen/dieu-kien");
assert.deepEqual(r.body.rules.filter((x) => x.active), [], "không còn điều kiện nào đang áp");
console.log("✓ khôi phục: chính sách 360/120/30/có, D2 = 29, điều kiện đã thêm đều đóng");

console.log("E2E CHINH SACH DIEU PHOI OK");
