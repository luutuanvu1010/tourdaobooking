// ADR-0117 lần 1, điều 4 (tiêu chí N-7 a3, b, h, i) — chiều 2 ở màn Quản lý tài khoản: hồ sơ đang mang loại đối tác được hưởng hoa hồng không nhận vai / quyền nội
// bộ. Chạy CẢ ứng dụng trên SQLite thật (khung tests/audit/harness.mjs). Câu chặn KHÔNG nêu tên loại (Nhân sự không xem Danh bạ — ADR-0071 điều 3b).
// (i): nhánh «gỡ ADMIN» của PUT /api/staff/:id/roles chạy HAI lô (quyền rồi vai) — luật phải chặn bằng hàm thuần TRƯỚC lô một, kẻo quyền đổi mà vai không.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const ADM2 = "66666666-6666-4666-8666-666666666666";
const HR = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const TGT = "99999999-9999-4999-8999-999999999999";
const AT = "2026-09-01T00:00:00.000Z";
const NHAN = "LE_TAN_SPA_HOA_SEN";
const TEN_NHAN = "Lễ tân spa Hoa Sen";
const CAU = "Hồ sơ này không nhận thêm vai trò nội bộ vào lúc này.";

function nen() {
  const w = world();
  for (const [id, phone, name, perms] of [
    [ADM, "0900000003", "Quản Trị", ["ADMIN"]], [ADM2, "0900000006", "Quản Trị Hai", ["ADMIN"]], [HR, "0900000004", "Nhân Sự", ["HR"]],
    [SUP, "0900000007", "Chủ", ["SUPER_ADMIN"]], [PARTNER, "0900000008", "Đối Tác", ["PARTNER"]],
  ] as const) seedStaff(w.sqlite, { id, phone, name, perms: [...perms] });
  w.sqlite.prepare("INSERT INTO pty_role_type (code, name, sort_order, role_group, is_partner_label) VALUES (?, ?, 40, 'OTHER', 1)").run(NHAN, TEN_NHAN);
  return w;
}
function hoSo(w: any, ten: string): string {
  const id = crypto.randomUUID();
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES (?, 'PERSON', ?, 1, ?, ?)").run(id, ten, AT, AT);
  w.sqlite.prepare("INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES (?, ?, ?, ?)").run(id, ten, AT, AT);
  return id;
}
async function ganNhan(w: any, partyId: string) {
  const r = await w.call("POST", `/api/parties/${partyId}/roles`, { as: ADM, body: { roleTypeCode: NHAN } });
  assert.equal(r.status, 201, `gắn loại: ${r.text}`);
}
async function taiKhoan(w: any, roles: string[], phone: string, ten: string): Promise<{ staffId: string; partyId: string }> {
  const r = await w.call("POST", "/api/staff", { as: SUP, body: { fullName: ten, phone, roles, taoHoSoMoi: true } });
  assert.equal(r.status, 201, r.text);
  return { staffId: r.json.staff.id, partyId: r.json.staff.partyId };
}
const quyenMo = (w: any, staffId: string): string[] =>
  w.q("SELECT permission_type_code c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", staffId).map((r: any) => r.c);
const vaiMo = (w: any, partyId: string): string[] =>
  w.q("SELECT role_type_code c FROM pty_party_role WHERE party_id = ? AND valid_to_date IS NULL AND role_type_code <> ? ORDER BY c", partyId, NHAN).map((r: any) => r.c);
const putRoles = (w: any, as: string, staffId: string, roles: string[]) => w.call("PUT", `/api/staff/${staffId}/roles`, { as, body: { roles } });
function bi409(r: any, ten: string) {
  assert.equal(r.status, 409, `${ten}: ${r.status} ${r.text}`);
  assert.equal(r.json.error.code, "account_rule", ten);
  assert.equal(r.json.error.message, CAU, ten);
  // (h): câu không nêu tên loại, mã loại hay nhãn của hồ sơ.
  const than = JSON.stringify(r.json);
  for (const lo of [TEN_NHAN, NHAN, "loại đối tác"]) assert.ok(!than.includes(lo), `${ten}: thân lộ «${lo}»: ${than}`);
}

test("N-7 (a3) ngược: tạo tài khoản ĐỐI TÁC trên hồ sơ đã mang loại → 201; tạo tài khoản Bán hàng trên hồ sơ đã mang loại → 409, không tạo gì", async () => {
  const w = nen();
  const p = hoSo(w, "Hồ Sơ Có Loại");
  await ganNhan(w, p);
  const dt = await w.call("POST", "/api/staff", { as: SUP, body: { phone: "0900000201", roles: ["HOTEL_RECEPTION"], partyId: p } });
  assert.equal(dt.status, 201, `tài khoản Đối tác: ${dt.text}`);
  assert.deepEqual(quyenMo(w, dt.json.staff.id), ["PARTNER"]);

  const q = hoSo(w, "Hồ Sơ Có Loại Hai");
  await ganNhan(w, q);
  const truoc = w.q("SELECT count(*) n FROM staff")[0].n;
  for (const roles of [["SALES_STAFF"], ["GUIDE_INTERNAL", "SALES_STAFF"]]) {
    bi409(await w.call("POST", "/api/staff", { as: SUP, body: { phone: "0900000202", roles, partyId: q } }), `tạo ${roles.join("+")}`);
  }
  assert.equal(w.q("SELECT count(*) n FROM staff")[0].n, truoc, "không tạo tài khoản");
  assert.deepEqual(vaiMo(w, q), [], "không mở vai nội bộ");
});

test("N-7 (b) nâng: PUT /api/staff/:id/roles đổi tài khoản Lễ tân (đã mang loại) sang Nhân viên kinh doanh — Quản trị, Toàn quyền, Nhân sự → 409; quyền, vai giữ nguyên", async () => {
  const w = nen();
  const le = await taiKhoan(w, ["HOTEL_RECEPTION"], "0900000203", "Lễ Tân Có Loại");
  await ganNhan(w, le.partyId);
  for (const as of [ADM, SUP, HR]) {
    bi409(await putRoles(w, as, le.staffId, ["SALES_STAFF"]), `người gọi ${as}`);
    assert.deepEqual(quyenMo(w, le.staffId), ["PARTNER"]);
    assert.deepEqual(vaiMo(w, le.partyId), ["HOTEL_RECEPTION"]);
  }
  // Đổi trong cùng phía bên ngoài vẫn được (không chặn nhầm).
  const r = await putRoles(w, ADM, le.staffId, ["COLLABORATOR"]);
  assert.equal(r.status, 200, r.text);
});

test("N-7 (b) mở lại vai: Bán hàng → Cộng tác viên (đóng SALES_STAFF hôm nay) → gắn loại (201, đối tác thuần) → đổi lại Bán hàng (đường MỞ LẠI dòng vai) → 409", async () => {
  const w = nen();
  const nv = await taiKhoan(w, ["SALES_STAFF"], "0900000204", "Đổi Phía");
  const r1 = await putRoles(w, SUP, nv.staffId, ["COLLABORATOR"]);
  assert.equal(r1.status, 200, r1.text);
  await ganNhan(w, nv.partyId);
  bi409(await putRoles(w, SUP, nv.staffId, ["SALES_STAFF"]), "mở lại SALES_STAFF");
  assert.deepEqual(quyenMo(w, nv.staffId), ["PARTNER"]);
  assert.deepEqual(vaiMo(w, nv.partyId), ["COLLABORATOR"]);
});

test("N-7 (b) đường quyền kiểu cũ: PUT /api/staff/:id/permissions đổi tài khoản Đối tác (hồ sơ mang loại) sang Bán hàng → 409 (trigger là lưới, không 500), quyền giữ nguyên", async () => {
  const w = nen();
  await ganNhan(w, `pty-${PARTNER}`);
  const r = await w.call("PUT", `/api/staff/${PARTNER}/permissions`, { as: SUP, body: { permissions: ["SALES"] } });
  bi409(r, "PUT permissions");
  assert.deepEqual(quyenMo(w, PARTNER), ["PARTNER"]);
});

test("N-7 (i): nhánh «gỡ ADMIN» (hai lô) — Quản trị mang loại (lậu bằng SQL) đổi sang Nhân viên kinh doanh → 409 TRƯỚC lô một: Quản trị vẫn mở, không mở vai", async () => {
  const w = nen();
  // Tài khoản Quản trị + Bán hàng kiểu cũ (chưa gán vai), hồ sơ không vai; loại chèn THẲNG bằng SQL — chỗ hở CSDL đã biết (ADR-0117 điều 4: vế 3 chỉ máy chủ
  // và R-PRC-6 canh). Lô một chỉ ĐÓNG Quản trị (Bán hàng đã có) nên trigger quyền không chặn được; chỉ lô hai (mở vai) vấp trigger vai hồ sơ.
  seedStaff(w.sqlite, { id: TGT, phone: "0900000009", name: "Quản Trị Mang Loại", perms: ["ADMIN", "SALES"] });
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES (?, ?, ?, '2026-01-01', ?, ?)")
    .run(crypto.randomUUID(), `pty-${TGT}`, NHAN, AT, AT);
  const quyenTruoc = w.q("SELECT id, valid_to_at FROM stf_permission WHERE staff_id = ? ORDER BY id", TGT);
  const r = await putRoles(w, SUP, TGT, ["SALES_STAFF"]);
  bi409(r, "gỡ ADMIN + mở SALES_STAFF");
  assert.deepEqual(w.q("SELECT id, valid_to_at FROM stf_permission WHERE staff_id = ? ORDER BY id", TGT), quyenTruoc, "stf_permission không đổi (lô một không chạy)");
  assert.deepEqual(quyenMo(w, TGT), ["ADMIN", "SALES"]);
  assert.deepEqual(vaiMo(w, `pty-${TGT}`), []);
  assert.equal(w.q("SELECT count(*) n FROM audit_log WHERE action = 'account_roles_changed' AND target_id = ?", TGT)[0].n, 0, "không nhật ký");
});
