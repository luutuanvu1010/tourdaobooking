// ADR-0083 điều 1 (accepted 2026-10-01) — kiểm MỨC ROUTE trên CẢ ứng dụng, SQLite thật (khung tests/audit/harness.mjs):
//  1a: đường gán quyền kiểu cũ PUT /api/staff/:id/permissions chỉ người hỏi được `admin.manage.superadmin` (Toàn quyền) — Quản trị, HCNS → 403, câu không
//      lộ chữ "Toàn quyền" (ADR-0042: vai ẩn), không ghi gì;
//  1b: chặn lai — tập quyền vừa có quyền bên ngoài (Đối tác, Tài xế đối tác) vừa có quyền nội bộ → 400 câu dễ hiểu, ở MỌI đường ghi quyền không qua vai
//      (PUT …/permissions và POST /api/staff không `roles`); LC-1b (Tài xế đối tác đứng một mình) giữ câu riêng của nó.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "44444444-4444-4444-8444-444444444444";
const SUP = "77777777-7777-4777-8777-777777777777";
const CU = "99999999-9999-4999-8999-999999999999"; // tài khoản đường cũ, chưa gán vai, đang giữ Đối tác
const BH = "88888888-8888-4888-8888-888888888888"; // tài khoản đường cũ, chưa gán vai, đang giữ Bán hàng

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000004", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: CU, phone: "0900000009", name: "Đối tác cũ", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: BH, phone: "0900000008", name: "Bán hàng cũ", perms: ["SALES"] });
  return w;
}
const LAI_NOI_NGOAI = "Một tài khoản không giữ cùng lúc quyền nội bộ và quyền bên ngoài (Đối tác, Tài xế đối tác) — chọn một phía.";
const LC1B = "Tài khoản Tài xế đối tác không giữ thêm quyền nào khác.";
const openPerms = (w: any, id: string): string[] =>
  w.q("SELECT permission_type_code AS c FROM stf_permission WHERE staff_id = ? AND valid_to_at IS NULL ORDER BY c", id).map((r: { c: string }) => r.c);
const permRows = (w: any): number => w.q("SELECT count(*) AS n FROM stf_permission")[0].n;
const logRows = (w: any): number => w.q("SELECT count(*) AS n FROM audit_log")[0].n;
const staffByPhone = (w: any, phone: string): number => w.q("SELECT count(*) AS n FROM staff WHERE phone = ?", phone)[0].n;
const put = (w: any, as: string, id: string, permissions: string[]) => w.call("PUT", `/api/staff/${id}/permissions`, { as, body: { permissions } });

test("1a: Quản trị và HCNS gọi PUT …/permissions (tài khoản cấp dưới, chưa gán vai) → 403 câu tiếng Việt không lộ 'Toàn quyền'; quyền giữ nguyên, không nhật ký", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  for (const as of [ADM, HR]) {
    for (const [id, next] of [[BH, ["ACCOUNTING"]], [BH, ["SALES", "FIELD"]], [CU, ["PARTNER"]]] as const) {
      const r = await put(w, as, id, [...next]);
      assert.equal(r.status, 403, `${as} → ${id}: ${r.text}`);
      assert.equal(r.json.error.code, "forbidden");
      assert.match(r.json.error.message, /người phụ trách hệ thống/);
      assert.match(r.json.error.message, /gán vai/, "câu chỉ đường: đổi quyền bằng cách gán vai");
      assert.doesNotMatch(r.json.error.message, /Toàn quyền/);
    }
  }
  assert.deepEqual(openPerms(w, BH), ["SALES"]);
  assert.deepEqual(openPerms(w, CU), ["PARTNER"]);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
});

test("1a: Toàn quyền vẫn đổi quyền kiểu cũ của tài khoản chưa gán vai → 200, một dòng nhật ký permission_changed", async () => {
  const w = setup();
  const r = await put(w, SUP, BH, ["SALES", "ACCOUNTING"]);
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(openPerms(w, BH), ["ACCOUNTING", "SALES"]);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'permission_changed' AND target_id = ?", BH)[0].n, 1);
});

test("1b: Toàn quyền gán kiểu cũ tập lai nội bộ + bên ngoài → 400 câu dễ hiểu, quyền giữ nguyên, không nhật ký", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  for (const [id, next] of [[CU, ["PARTNER", "SALES"]], [BH, ["SALES", "PARTNER"]], [BH, ["DRIVER", "PARTNER"]], [CU, ["PARTNER", "ADMIN"]]] as const) {
    const r = await put(w, SUP, id, [...next]);
    assert.equal(r.status, 400, `${next.join("+")}: ${r.text}`);
    assert.deepEqual(r.json.error, { code: "invalid_input", message: LAI_NOI_NGOAI }, next.join("+"));
  }
  assert.deepEqual(openPerms(w, CU), ["PARTNER"]);
  assert.deepEqual(openPerms(w, BH), ["SALES"]);
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
});

test("1b: LC-1b giữ nguyên câu riêng — Tài xế đối tác + quyền khác → câu LC-1b (đứng trước luật lai mới)", async () => {
  const w = setup();
  for (const next of [["DRIVER_PARTNER", "SALES"], ["PARTNER", "DRIVER_PARTNER"]]) {
    const r = await put(w, SUP, CU, next);
    assert.equal(r.status, 400, r.text);
    assert.deepEqual(r.json.error, { code: "invalid_input", message: LC1B }, next.join("+"));
  }
  assert.deepEqual(openPerms(w, CU), ["PARTNER"]);
});

test("1b: POST /api/staff không vai (đường quyền cũ) — tập lai → 400 câu dễ hiểu cho cả Toàn quyền lẫn HCNS, không tạo tài khoản; tập một phía vẫn 201", async () => {
  const w = setup();
  const [perms, logs] = [permRows(w), logRows(w)];
  let so = 400;
  for (const as of [SUP, HR]) {
    for (const permissions of [["PARTNER", "SALES"], ["FIELD", "PARTNER"]]) {
      const phone = `0911000${++so}`;
      const r = await w.call("POST", "/api/staff", { as, body: { fullName: `Người Lai ${so}`, phone, permissions, taoHoSoMoi: true } });
      assert.equal(r.status, 400, `${as} ${permissions.join("+")}: ${r.text}`);
      assert.deepEqual(r.json.error, { code: "invalid_input", message: LAI_NOI_NGOAI });
      assert.equal(staffByPhone(w, phone), 0);
    }
  }
  assert.equal(permRows(w), perms);
  assert.equal(logRows(w), logs);
  const ok = await w.call("POST", "/api/staff", { as: HR, body: { fullName: "Đối Tác Đường Cũ", phone: "0911000499", permissions: ["PARTNER"], taoHoSoMoi: true } });
  assert.equal(ok.status, 201, ok.text);
  assert.deepEqual(openPerms(w, ok.json.staff.id), ["PARTNER"]);
});
