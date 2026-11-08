// ADR-0185 Đ2 (chủ duyệt 2026-11-08) — MỨC ROUTE trên CẢ ứng dụng, SQLite thật (khung tests/audit/harness.mjs): đường ghi quyền KHÔNG qua vai trò không cấp quyền
// bên ngoài (Đối tác, Tài xế đối tác) — POST /api/staff không `roles` và PUT /api/staff/:id/permissions → 400 câu chỉ đường chọn vai trò, không ghi gì. Tài khoản lai
// giữ câu cũ (K7). Nhánh gỡ Quản trị của PUT …/roles mà quyền sau có thêm Đối tác → 409 câu riêng TRƯỚC lô một (K6). Đường theo vai trò vẫn tạo được Đối tác
// (tiêu chí 8). Hàng rào H2 (docs/SO-HANG-RAO.md): bỏ lời gọi quyenNgoaiDuongCuProblem ở từng đường → bài của đường đó ĐỎ (POST ra 409 của trigger, không 500).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CAU_DUONG_CU_QUYEN_NGOAI, CAU_GO_QUAN_TRI_SANG_DOI_TAC } from "../../shared/roles.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SUP = "77777777-7777-4777-8777-777777777777";
const QT = "33333333-3333-4333-8333-333333333333"; // Quản trị khác — để gỡ Quản trị của QT2 không vướng «quản trị viên cuối cùng»
const QT2 = "33333333-3333-4333-8333-333333333334"; // Quản trị theo vai trò Giám đốc
const BH = "88888888-8888-4888-8888-888888888888"; // tài khoản đường cũ, chưa gán vai trò, đang giữ Bán hàng

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: QT, phone: "0900000003", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: QT2, phone: "0900000004", name: "Giám Đốc", perms: ["ADMIN"], vai: "DIRECTOR" });
  seedStaff(w.sqlite, { id: BH, phone: "0900000008", name: "Bán Hàng Cũ", perms: ["SALES"] });
  return w;
}
const quyenMo = (w: any, id: string): string[] => w.q("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", id).map((r: any) => r.c);
const vaiMo = (w: any, partyId: string): string[] => w.q("SELECT role_type_code AS c FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL ORDER BY c", partyId).map((r: any) => r.c);
const soTaiKhoan = (w: any, phone: string): number => Number(w.q("SELECT count(*) AS n FROM staff WHERE phone = ?", phone)[0].n);
const soNhatKy = (w: any): number => Number(w.q("SELECT count(*) AS n FROM audit_log")[0].n);
const taoCu = (w: any, phone: string, permissions: string[]) =>
  w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Người Đường Cũ", phone, permissions, taoHoSoMoi: true } });

test("POST /api/staff không vai trò, chỉ quyền bên ngoài (Đối tác; Tài xế đối tác) → 400 câu chỉ đường chọn vai trò; không tài khoản, không nhật ký", async () => {
  const w = setup();
  const nk = soNhatKy(w);
  for (const [phone, permissions] of [["0911000501", ["PARTNER"]], ["0911000502", ["DRIVER_PARTNER"]], ["0911000503", ["PARTNER", "DRIVER_PARTNER"]]] as const) {
    const r = await taoCu(w, phone, [...permissions]);
    assert.equal(r.status, 400, `${permissions.join("+")}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
    if (permissions.length === 1) assert.equal(r.json.error.message, CAU_DUONG_CU_QUYEN_NGOAI, permissions.join("+"));
    assert.equal(soTaiKhoan(w, phone), 0, `${permissions.join("+")}: không tài khoản`);
  }
  assert.equal(soNhatKy(w), nk, "không nhật ký");
});

test("K7: POST /api/staff tập lai (quyền nội bộ + Đối tác) vẫn nhận câu lai cũ, không phải câu đường cũ", async () => {
  const w = setup();
  const r = await taoCu(w, "0911000504", ["SALES", "PARTNER"]);
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "invalid_input");
  assert.notEqual(r.json.error.message, CAU_DUONG_CU_QUYEN_NGOAI);
  assert.equal(soTaiKhoan(w, "0911000504"), 0);
});

test("PUT /api/staff/:id/permissions (tài khoản chưa gán vai trò) sang Đối tác hoặc Tài xế đối tác → 400 câu đường cũ; quyền giữ nguyên, không nhật ký", async () => {
  const w = setup();
  const nk = soNhatKy(w);
  for (const permissions of [["PARTNER"], ["DRIVER_PARTNER"]]) {
    const r = await w.call("PUT", `/api/staff/${BH}/permissions`, { as: SUP, body: { permissions } });
    assert.equal(r.status, 400, `${permissions.join("+")}: ${r.text}`);
    assert.deepEqual(r.json.error, { code: "invalid_input", message: CAU_DUONG_CU_QUYEN_NGOAI });
  }
  assert.deepEqual(quyenMo(w, BH), ["SALES"]);
  assert.equal(soNhatKy(w), nk);
  // đối chứng: đường cũ giữa các quyền nội bộ như hôm nay
  const ok = await w.call("PUT", `/api/staff/${BH}/permissions`, { as: SUP, body: { permissions: ["SALES", "FIELD"] } });
  assert.equal(ok.status, 200, ok.text);
  assert.deepEqual(quyenMo(w, BH), ["FIELD", "SALES"]);
});

test("K6: PUT /api/staff/:id/roles gỡ Quản trị sang vai trò đối tác → 409 câu riêng TRƯỚC lô một; quyền và vai trò giữ nguyên, không nhật ký", async () => {
  const w = setup();
  const nk = soNhatKy(w);
  const r = await w.call("PUT", `/api/staff/${QT2}/roles`, { as: SUP, body: { roles: ["TRAVEL_AGENCY"] } });
  assert.equal(r.status, 409, r.text);
  assert.deepEqual(r.json.error, { code: "account_rule", message: CAU_GO_QUAN_TRI_SANG_DOI_TAC });
  assert.deepEqual(quyenMo(w, QT2), ["ADMIN"]);
  assert.deepEqual(vaiMo(w, `pty-${QT2}`), ["DIRECTOR"]);
  assert.equal(soNhatKy(w), nk);
  // đối chứng: đổi sang vai trò nội bộ khác, lưu, rồi gán vai trò đối tác thì được (đúng lời câu báo)
  assert.equal((await w.call("PUT", `/api/staff/${QT2}/roles`, { as: SUP, body: { roles: ["SALES_STAFF"] } })).status, 200);
  const sau = await w.call("PUT", `/api/staff/${QT2}/roles`, { as: SUP, body: { roles: ["TRAVEL_AGENCY"] } });
  assert.equal(sau.status, 200, sau.text);
  assert.deepEqual(quyenMo(w, QT2), ["PARTNER"]);
  assert.deepEqual(vaiMo(w, `pty-${QT2}`), ["TRAVEL_AGENCY"]);
});

test("tiêu chí 8: POST /api/staff theo vai trò Công ty lữ hành → 201; tài khoản giữ Đối tác, hồ sơ mở vai trò đó", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: "Đối Tác Theo Vai", phone: "0911000505", roles: ["TRAVEL_AGENCY"], taoHoSoMoi: true } });
  assert.equal(r.status, 201, r.text);
  assert.deepEqual(quyenMo(w, r.json.staff.id), ["PARTNER"]);
  assert.deepEqual(vaiMo(w, r.json.staff.partyId), ["TRAVEL_AGENCY"]);
});
