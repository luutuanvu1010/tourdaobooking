// ADR-0118 Đ1, Đ6 (Đợt 2 lượt 1, Task 2; kế hoạch docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md N-4…N-7): cờ "Có đưa đón" của nhóm dịch vụ —
// `PATCH /api/catalog/groups/:code` nhận `transferEnabled`, nhật ký `catalog_group_updated` ghi "đưa đón: bật → tắt", `GET /api/catalog/for-order` +
// `GET /api/catalog` mang `transferEnabled` của TỪNG dịch vụ (theo nhóm hiện hành, không theo vai), `GET /api/catalog/groups` mang cờ của từng nhóm.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs) — cùng khuôn với nhom-route.test.ts.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const ADM = "33333333-3333-4333-8333-333333333333";
const FIELD = "44444444-4444-4444-8444-444444444444";
const ACC = "55555555-5555-4555-8555-555555555555";
const SUP = "77777777-7777-4777-8777-777777777777";
const PARTNER = "88888888-8888-4888-8888-888888888888";
const INTERN = "99999999-9999-4999-8999-999999999999";
const NAME: Record<string, string> = { [SALES]: "Bán hàng", [ADM]: "Quản trị", [FIELD]: "Hướng dẫn viên", [ACC]: "Kế toán", [SUP]: "Toàn quyền", [PARTNER]: "Đối tác", [INTERN]: "Thực tập" };
const NOW = "2026-09-01T00:00:00.000Z";
const CODES = ["TTBSNO", "TTBPC", "TDX1", "LP1"];

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: FIELD, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  CODES.forEach((c, n) =>
    w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, sheet_row, in_sheet, first_seen_at, updated_at)
      VALUES ('${c}', 'Dịch vụ ${c}', 'perPax', 100000, ${n + 1}, 1, '${NOW}', '${NOW}')`),
  );
  return w;
}
const nhom = (w: any, code: string) => w.q("SELECT * FROM ctl_group WHERE code = ?", code)[0];
const nhatKy = (w: any, action: string) => w.q("SELECT detail FROM audit_log WHERE action = ? ORDER BY rowid", action).map((r: any) => r.detail as string);
const patch = (w: any, code: string, as: string, body: Record<string, unknown>) => w.call("PATCH", `/api/catalog/groups/${code}`, { as, body });
const gan = async (w: any, codes: string[], groupCode: string | null) => {
  const r = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes, groupCode } });
  assert.equal(r.status, 200, r.text);
};
const cho = (r: any): Record<string, boolean> => Object.fromEntries(r.json.items.map((i: any) => [i.code, i.transferEnabled]));

test("N-4: PATCH nhận `transferEnabled` boolean — tắt rồi bật lại; trả cờ mới + mốc mới; kiểu khác (chữ, số, null) → 400; không kèm mốc → 400; mốc lệch → 409 stale", async () => {
  const w = setup();
  const g0 = nhom(w, "TDA");
  assert.equal(g0.transfer_enabled, 1, "gieo mặc định BẬT");
  for (const sai of ["false", 0, 1, null, [], {}]) {
    const r = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: sai });
    assert.equal(r.status, 400, `${JSON.stringify(sai)}: ${r.text}`);
    assert.equal(r.json.error.code, "invalid_input");
  }
  assert.equal(nhom(w, "TDA").transfer_enabled, 1, "kiểu sai không ghi gì");
  const thieuMoc = await patch(w, "TDA", ADM, { transferEnabled: false });
  assert.equal(thieuMoc.status, 400, thieuMoc.text);
  const tat = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: false });
  assert.equal(tat.status, 200, tat.text);
  assert.equal(tat.json.group.transferEnabled, false);
  assert.notEqual(tat.json.group.updatedAt, g0.updated_at, "mốc nhóm đổi");
  assert.equal(nhom(w, "TDA").transfer_enabled, 0);
  const cu = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: true });
  assert.equal(cu.status, 409, "mốc cũ");
  assert.equal(cu.json.error.code, "stale");
  assert.equal(nhom(w, "TDA").transfer_enabled, 0, "bên thua không ghi");
  const bat = await patch(w, "TDA", SUP, { expectedUpdatedAt: tat.json.group.updatedAt, transferEnabled: true });
  assert.equal(bat.status, 200, bat.text);
  assert.equal(bat.json.group.transferEnabled, true);
  // Chỉ có mốc, không có gì để đổi → vẫn 400 như trước ADR-0118.
  const trong = await patch(w, "TDA", ADM, { expectedUpdatedAt: bat.json.group.updatedAt });
  assert.equal(trong.status, 400, trong.text);
});

test("N-4: `transferEnabled` trùng giá trị đang có → trả nhóm, KHÔNG ghi, KHÔNG nhật ký, mốc giữ nguyên", async () => {
  const w = setup();
  const g0 = nhom(w, "TDA");
  const r = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: true });
  assert.equal(r.status, 200, r.text);
  assert.equal(r.json.group.transferEnabled, true);
  assert.equal(r.json.group.updatedAt, g0.updated_at);
  assert.deepEqual(nhatKy(w, "catalog_group_updated"), []);
});

test("N-4: nhóm không có → 404; đổi CẢ tên + cờ trong một lần → một dòng nhật ký có đủ hai phần; tắt nhóm còn dịch vụ vẫn 409 group_not_empty (luật cũ không đổi)", async () => {
  const w = setup();
  const g0 = nhom(w, "TDA");
  assert.equal((await patch(w, "KHONGCO", ADM, { expectedUpdatedAt: "x", transferEnabled: false })).status, 404);
  const r = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, name: "Tour đảo mới", transferEnabled: false });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(nhatKy(w, "catalog_group_updated"), ["Tour đảo: tên Tour đảo → Tour đảo mới; đưa đón: bật → tắt"]);
  await gan(w, ["TDX1"], "TDA");
  const tatNhom = await patch(w, "TDA", ADM, { expectedUpdatedAt: r.json.group.updatedAt, active: false });
  assert.equal(tatNhom.status, 409, tatNhom.text);
  assert.equal(tatNhom.json.error.code, "group_not_empty");
});

test("N-5: đổi cờ ghi ĐÚNG MỘT dòng `catalog_group_updated` có \"đưa đón: bật → tắt\" (rồi \"tắt → bật\"), không hành động nhật ký mới; nhật ký không có SĐT / email", async () => {
  const w = setup();
  const g0 = nhom(w, "TTB");
  const tat = await patch(w, "TTB", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: false });
  assert.equal(tat.status, 200, tat.text);
  assert.deepEqual(nhatKy(w, "catalog_group_updated"), ["Thể thao biển: đưa đón: bật → tắt"]);
  const bat = await patch(w, "TTB", ADM, { expectedUpdatedAt: tat.json.group.updatedAt, transferEnabled: true });
  assert.equal(bat.status, 200, bat.text);
  assert.deepEqual(nhatKy(w, "catalog_group_updated"), ["Thể thao biển: đưa đón: bật → tắt", "Thể thao biển: đưa đón: tắt → bật"]);
  const hanhDong = w.q("SELECT DISTINCT action FROM audit_log WHERE detail LIKE '%đưa đón%'").map((r: any) => r.action);
  assert.deepEqual(hanhDong, ["catalog_group_updated"], "dùng hành động sẵn có, không thêm hành động mới");
  assert.equal(w.q("SELECT COUNT(*) AS n FROM audit_log WHERE detail GLOB '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9]*' OR detail LIKE '%@%'")[0].n, 0, "không số điện thoại / email trong nhật ký");
});

test("N-5: Bán hàng, Kế toán, Hướng dẫn viên, Đối tác, Thực tập → 403 khi đổi cờ (thân hợp lệ), không ghi gì, không nhật ký; Quản trị và Toàn quyền → 200", async () => {
  const w = setup();
  const g0 = nhom(w, "TDA");
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN]) {
    const r = await patch(w, "TDA", as, { expectedUpdatedAt: g0.updated_at, transferEnabled: false });
    assert.equal(r.status, 403, `${NAME[as]}: ${r.text}`);
    assert.equal(r.json.error.code, "forbidden");
  }
  assert.equal(nhom(w, "TDA").transfer_enabled, 1);
  assert.equal(nhom(w, "TDA").updated_at, g0.updated_at);
  assert.deepEqual(nhatKy(w, "catalog_group_updated"), []);
  const q = await patch(w, "TDA", ADM, { expectedUpdatedAt: g0.updated_at, transferEnabled: false });
  assert.equal(q.status, 200, q.text);
  const t = await patch(w, "TDA", SUP, { expectedUpdatedAt: q.json.group.updatedAt, transferEnabled: true });
  assert.equal(t.status, 200, t.text);
});

test("N-6: GET /api/catalog/for-order — `transferEnabled` theo nhóm hiện hành, GIỐNG NHAU cho mọi vai kể cả Đối tác / Thực tập; nhóm tắt → mọi dịch vụ của nó false; Chưa phân loại → true", async () => {
  const w = setup();
  await gan(w, ["TTBSNO", "TTBPC"], "TTB");
  await gan(w, ["TDX1"], "TDA");
  const g = nhom(w, "TTB");
  const tat = await patch(w, "TTB", ADM, { expectedUpdatedAt: g.updated_at, transferEnabled: false });
  assert.equal(tat.status, 200, tat.text);
  const mong = { LP1: true, TDX1: true, TTBPC: false, TTBSNO: false };
  for (const as of [PARTNER, INTERN, SALES, ADM, SUP]) {
    const r = await w.call("GET", "/api/catalog/for-order", { as });
    assert.equal(r.status, 200, `${NAME[as]}: ${r.text}`);
    assert.deepEqual(cho(r), mong, NAME[as]);
    for (const item of r.json.items) assert.equal(typeof item.transferEnabled, "boolean");
  }
  const vp = await w.call("GET", "/api/catalog", { as: SALES });
  assert.deepEqual(cho(vp), mong, "GET /api/catalog (cổng office) cùng nội dung");
  // Bật lại → mọi dịch vụ true.
  const bat = await patch(w, "TTB", ADM, { expectedUpdatedAt: tat.json.group.updatedAt, transferEnabled: true });
  assert.equal(bat.status, 200, bat.text);
  assert.deepEqual(cho(await w.call("GET", "/api/catalog/for-order", { as: SALES })), { LP1: true, TDX1: true, TTBPC: true, TTBSNO: true });
});

test("N-6: dịch vụ chuyển sang nhóm khác đổi cờ theo; về Chưa phân loại → true; nhóm đang NGƯNG DÙNG (sửa thẳng SQL) không còn nghĩa → true (cùng luật với view v_ctl_service_transfer)", async () => {
  const w = setup();
  await gan(w, ["TTBSNO"], "TTB");
  const g = nhom(w, "TTB");
  await patch(w, "TTB", ADM, { expectedUpdatedAt: g.updated_at, transferEnabled: false });
  assert.equal(cho(await w.call("GET", "/api/catalog/for-order", { as: SALES })).TTBSNO, false);
  await gan(w, ["TTBSNO"], "TDA");
  assert.equal(cho(await w.call("GET", "/api/catalog/for-order", { as: SALES })).TTBSNO, true, "sang nhóm bật");
  await gan(w, ["TTBSNO"], "TTB");
  assert.equal(cho(await w.call("GET", "/api/catalog/for-order", { as: SALES })).TTBSNO, false, "lại về nhóm tắt");
  await gan(w, ["TTBSNO"], null);
  assert.equal(cho(await w.call("GET", "/api/catalog/for-order", { as: SALES })).TTBSNO, true, "Chưa phân loại");
  await gan(w, ["TTBSNO"], "TTB");
  w.sqlite.exec("UPDATE ctl_group SET active = 0 WHERE code = 'TTB'");
  const r = await w.call("GET", "/api/catalog/for-order", { as: SALES });
  assert.equal(cho(r).TTBSNO, true, "nhóm ngưng dùng → dịch vụ coi như Chưa phân loại");
  assert.equal(r.json.items.find((i: any) => i.code === "TTBSNO").groupCode, null);
  // Máy chủ (view) và form (DTO) đồng ý với nhau.
  assert.equal(w.q("SELECT transfer_enabled AS t FROM v_ctl_service_transfer WHERE catalog_code = 'TTBSNO'")[0].t, 1);
});

test("N-7: GET /api/catalog/groups và GET /api/catalog/admin mang `transferEnabled` của TỪNG nhóm (14 nhóm gieo đều true); PATCH/POST trả nhóm cùng khoá", async () => {
  const w = setup();
  const g = await w.call("GET", "/api/catalog/groups", { as: ADM });
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.groups.length, 14);
  assert.ok(g.json.groups.every((x: any) => x.transferEnabled === true));
  assert.deepEqual(Object.keys(g.json.groups[0]).sort(), ["active", "code", "name", "soDichVu", "sortOrder", "transferEnabled", "updatedAt"]);
  const tda = g.json.groups.find((x: any) => x.code === "TDA");
  const tat = await patch(w, "TDA", ADM, { expectedUpdatedAt: tda.updatedAt, transferEnabled: false });
  assert.equal(tat.status, 200, tat.text);
  assert.equal(tat.json.group.transferEnabled, false);
  const lai = await w.call("GET", "/api/catalog/groups", { as: ADM });
  assert.equal(lai.json.groups.find((x: any) => x.code === "TDA").transferEnabled, false);
  assert.equal(lai.json.groups.filter((x: any) => x.transferEnabled === false).length, 1);
  const admin = await w.call("GET", "/api/catalog/admin", { as: ADM });
  assert.equal(admin.status, 200, admin.text);
  assert.equal(admin.json.groups.find((x: any) => x.code === "TDA").transferEnabled, false);
  const moi = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm thử" } });
  assert.equal(moi.status, 201, moi.text);
  assert.equal(moi.json.group.transferEnabled, true, "nhóm mới mặc định có đưa đón");
});
