// ADR-0058 Đ3, Đ4 (Task A3): năm route quản trị nhóm dịch vụ — chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs), cùng khuôn với
// danh-muc-lap-don.test.ts. Phủ NT-A6 (quyền, HỎI QUYỀN TRƯỚC khi đọc thân), NT-A7 (400/404/409), NT-A8 (nhật ký mỗi dịch vụ một dòng).
// GIỚI HẠN: hôm nay cổng thô `admin` (router, passesAdminGate = ADMIN/SUPER_ADMIN) đã chặn năm vai kia TRƯỚC thân handler, nên ca 403 dưới đây xanh
// kể cả khi thân thiếu / đặt sai chỗ `can(admin.manage)` — thứ tự trong THÂN chỉ được bài này thấy khi cổng rộng hơn ô. Thấy chặn thật (P16,
// 2026-09-30, sổ nhật ký thi công lượt 1): đổi tạm cổng PUT /api/catalog/group-assignments sang "office" (can vẫn dòng đầu) → xanh; thêm dời `can`
// xuống SAU `kiemLoGan` → ca NT-A6 đỏ (Bán hàng nhận 400 "Mỗi lần gán tối đa 50 dịch vụ." thay vì 403) → hoàn nguyên. Thiếu hẳn `can` do
// hàng rào 2 luật (4) (src/route-write-guard.test.ts) bắt.
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
const CODES = ["TTBSNO", "TTBPC", "TDX1", "TDX2", "LP1"];

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
const hienHanh = (w: any, service: string) =>
  w.q("SELECT group_code FROM ctl_service_group WHERE service_code = ? ORDER BY seq DESC LIMIT 1", service)[0]?.group_code;
const demNhatKy = (w: any, action: string) => Number(w.q("SELECT COUNT(*) AS n FROM audit_log WHERE action = ?", action)[0].n);

test("NT-A6: Bán hàng, Kế toán, HDV, Đối tác, Thực tập → 403 ở CẢ năm route nhóm — hỏi quyền TRƯỚC khi đọc thân (thân sai / mã lạ vẫn 403, không 400/404/409), không ghi gì", async () => {
  const w = setup();
  const ttb = nhom(w, "TTB");
  const cases: [string, string, unknown][] = [
    ["GET", "/api/catalog/groups", undefined],
    ["POST", "/api/catalog/groups", { name: "" }], // tên rỗng: nếu kiểm thân trước sẽ là 400
    ["POST", "/api/catalog/groups", { name: "Nhóm lén" }], // thân hợp lệ: nếu thiếu kiểm quyền sẽ là 201
    ["PATCH", "/api/catalog/groups/KHONGCO", { expectedUpdatedAt: "x", name: "A" }], // mã lạ: nếu đọc trước sẽ là 404
    ["PATCH", "/api/catalog/groups/TTB", { expectedUpdatedAt: ttb.updated_at, active: false }],
    ["PUT", "/api/catalog/group-assignments", { codes: Array.from({ length: 51 }, (_, i) => `TD${i}`), groupCode: "TTB" }], // 51 mã: nếu kiểm thân trước sẽ là 400
    ["PUT", "/api/catalog/group-assignments", { codes: ["TTBSNO"], groupCode: "KHONGCO" }], // nhóm lạ: nếu đọc trước sẽ là 404
    ["PUT", "/api/catalog/group-assignments", { codes: ["TTBSNO"], groupCode: "TTB" }],
    ["GET", "/api/catalog/KHONGCO/group-history", undefined], // mã lạ: nếu đọc trước sẽ là 404
    ["GET", "/api/catalog/TTBSNO/group-history", undefined],
  ];
  for (const as of [SALES, ACC, FIELD, PARTNER, INTERN]) {
    for (const [m, p, body] of cases) {
      const r = await w.call(m, p, { as, body });
      assert.equal(r.status, 403, `${NAME[as]} ${m} ${p} ${JSON.stringify(body)}: ${r.text}`);
      assert.equal(r.json.error.code, "forbidden");
      assert.equal(r.json.groups, undefined);
      assert.equal(r.json.items, undefined);
    }
  }
  assert.equal(w.q("SELECT COUNT(*) AS n FROM ctl_group")[0].n, 14, "không thêm nhóm nào");
  assert.equal(w.q("SELECT COUNT(*) AS n FROM ctl_service_group")[0].n, 0, "không gán gì");
  assert.equal(nhom(w, "TTB").active, 1);
  assert.equal(w.q("SELECT COUNT(*) AS n FROM audit_log WHERE action IN ('catalog_group_created', 'catalog_group_updated', 'catalog_group_assigned')")[0].n, 0, "không dòng nhật ký nhóm nào (dòng gieo của migration không tính)");
});

test("NT-A6: Quản trị và Toàn quyền dùng được năm route (200/201)", async () => {
  const w = setup();
  for (const [as, ten] of [[ADM, "Nhóm của QT"], [SUP, "Nhóm của TQ"]] as const) {
    const list = await w.call("GET", "/api/catalog/groups", { as });
    assert.equal(list.status, 200, list.text);
    const tao = await w.call("POST", "/api/catalog/groups", { as, body: { name: ten } });
    assert.equal(tao.status, 201, tao.text);
    const sua = await w.call("PATCH", `/api/catalog/groups/${tao.json.group.code}`, { as, body: { expectedUpdatedAt: tao.json.group.updatedAt, sortOrder: 99 } });
    assert.equal(sua.status, 200, sua.text);
    const gan = await w.call("PUT", "/api/catalog/group-assignments", { as, body: { codes: ["LP1"], groupCode: tao.json.group.code } });
    assert.equal(gan.status, 200, gan.text);
    const ls = await w.call("GET", "/api/catalog/LP1/group-history", { as });
    assert.equal(ls.status, 200, ls.text);
    assert.equal(ls.json.items[0].nhom, ten);
    assert.equal(ls.json.items[0].createdBy, as, "createdBy là id tài khoản");
  }
});

test("GET /api/catalog/groups: mọi nhóm (kể cả tắt) + số dịch vụ hiện hành + số Chưa phân loại (mọi dịch vụ của danh mục không có nhóm hiện hành)", async () => {
  const w = setup();
  let r = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBSNO", "TTBPC"], groupCode: "TTB" } });
  assert.equal(r.status, 200, r.text);
  r = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBPC"], groupCode: null } });
  assert.equal(r.status, 200, r.text);
  const g = await w.call("GET", "/api/catalog/groups", { as: ADM });
  assert.equal(g.status, 200, g.text);
  assert.deepEqual(Object.keys(g.json).sort(), ["chuaPhanLoai", "groups"]);
  assert.equal(g.json.groups.length, 14);
  assert.deepEqual(g.json.groups.map((x: any) => x.sortOrder), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  assert.deepEqual(Object.keys(g.json.groups[0]).sort(), ["active", "code", "name", "soDichVu", "sortOrder", "updatedAt"]);
  assert.equal(g.json.groups.find((x: any) => x.code === "TTB").soDichVu, 1, "TTBPC đã về Chưa phân loại — chỉ TTBSNO còn");
  assert.equal(g.json.chuaPhanLoai, 4, "5 dịch vụ − 1 đang ở TTB");
});

test("POST /api/catalog/groups: 201 + nhật ký catalog_group_created (detail = tên); sortOrder vắng = lớn nhất + 1; tên rỗng / dài → 400; trùng tên nhóm đang dùng → 409", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "  Lặn biển  " } });
  assert.equal(r.status, 201, r.text);
  assert.equal(r.json.group.name, "Lặn biển");
  assert.equal(r.json.group.sortOrder, 15);
  assert.equal(r.json.group.active, true);
  assert.equal(r.json.group.soDichVu, 0);
  assert.match(r.json.group.updatedAt, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/, "mốc ISO UTC có mili-giây");
  const log = w.q("SELECT * FROM audit_log WHERE action = 'catalog_group_created'");
  assert.equal(log.length, 1);
  assert.equal(log[0].detail, "Lặn biển");
  assert.equal(log[0].target_type, "catalog");
  assert.equal(log[0].target_id, null, "không lộ mã nhóm máy sinh lên trang Nhật ký");
  assert.equal(log[0].staff_id, ADM);
  const r2 = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Nhóm B", sortOrder: 3 } });
  assert.equal(r2.status, 201, r2.text);
  assert.equal(r2.json.group.sortOrder, 3);
  for (const body of [{ name: "" }, { name: "   " }, { name: "x".repeat(41) }, { name: 5 }, {}, { name: "Hợp lệ", sortOrder: -1 }, { name: "Hợp lệ", sortOrder: 1.5 }]) {
    const bad = await w.call("POST", "/api/catalog/groups", { as: ADM, body });
    assert.equal(bad.status, 400, `${JSON.stringify(body)}: ${bad.text}`);
  }
  const dup = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Thể thao biển" } });
  assert.equal(dup.status, 409, dup.text);
  assert.match(dup.json.error.message, /đã có nhóm/);
  assert.equal(demNhatKy(w, "catalog_group_created"), 2, "lần lỗi không ghi nhật ký");
});

test("PATCH /api/catalog/groups/:code: đổi tên/thứ tự/tắt-bật; 404 mã lạ; 409 sai mốc, trùng tên, tắt nhóm còn dịch vụ, BẬT LẠI nhóm tắt mà tên trùng nhóm đang dùng", async () => {
  const w = setup();
  let g = nhom(w, "TTB");
  assert.equal((await w.call("PATCH", "/api/catalog/groups/KHONGCO", { as: ADM, body: { expectedUpdatedAt: g.updated_at, name: "A" } })).status, 404);
  assert.equal((await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: "2020-01-01T00:00:00.000Z", name: "A" } })).status, 409, "sai mốc");
  assert.equal((await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { name: "A" } })).status, 400, "thiếu expectedUpdatedAt");
  assert.equal((await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at } })).status, 400, "không có gì để đổi");
  assert.equal((await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at, active: "no" } })).status, 400);
  const dup = await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at, name: "Tour đảo" } });
  assert.equal(dup.status, 409, dup.text);
  assert.match(dup.json.error.message, /đã có nhóm/);
  // tắt nhóm còn dịch vụ → 409 với số dịch vụ
  await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBSNO", "TTBPC"], groupCode: "TTB" } });
  g = nhom(w, "TTB");
  const off = await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at, active: false } });
  assert.equal(off.status, 409, off.text);
  assert.equal(off.json.error.message, "Nhóm còn 2 dịch vụ, chuyển chúng sang nhóm khác trước.");
  assert.equal(nhom(w, "TTB").active, 1);
  // đổi tên + thứ tự: 200, một dòng nhật ký có trước → sau
  const ok = await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at, name: "Trò chơi biển", sortOrder: 20 } });
  assert.equal(ok.status, 200, ok.text);
  assert.equal(ok.json.group.name, "Trò chơi biển");
  assert.equal(ok.json.group.sortOrder, 20);
  assert.equal(ok.json.group.soDichVu, 2);
  assert.notEqual(ok.json.group.updatedAt, g.updated_at);
  let log = w.q("SELECT * FROM audit_log WHERE action = 'catalog_group_updated'");
  assert.equal(log.length, 1);
  assert.equal(log[0].detail, "Thể thao biển: tên Thể thao biển → Trò chơi biển; thứ tự 7 → 20");
  // mốc cũ nay đã sai → 409, không nhật ký
  assert.equal((await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: g.updated_at, sortOrder: 1 } })).status, 409);
  // PATCH không đổi gì thật (cùng giá trị) → 200, không nhật ký
  const same = await w.call("PATCH", "/api/catalog/groups/TTB", { as: ADM, body: { expectedUpdatedAt: ok.json.group.updatedAt, sortOrder: 20 } });
  assert.equal(same.status, 200, same.text);
  assert.equal(demNhatKy(w, "catalog_group_updated"), 1);
  // tắt nhóm rỗng: 200; rồi tạo nhóm mới trùng tên nhóm tắt (được — tên chỉ cấm trùng giữa nhóm đang dùng); bật lại nhóm tắt → 409
  let lph = nhom(w, "LPH");
  const tat = await w.call("PATCH", "/api/catalog/groups/LPH", { as: ADM, body: { expectedUpdatedAt: lph.updated_at, active: false } });
  assert.equal(tat.status, 200, tat.text);
  assert.equal(tat.json.group.active, false);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'catalog_group_updated' ORDER BY created_at DESC, rowid DESC LIMIT 1")[0].detail, "Long Phú: đang dùng → đã tắt");
  const moi = await w.call("POST", "/api/catalog/groups", { as: ADM, body: { name: "Long Phú" } });
  assert.equal(moi.status, 201, moi.text);
  lph = nhom(w, "LPH");
  const bat = await w.call("PATCH", "/api/catalog/groups/LPH", { as: ADM, body: { expectedUpdatedAt: lph.updated_at, active: true } });
  assert.equal(bat.status, 409, bat.text);
  assert.match(bat.json.error.message, /bật lại/i);
  assert.equal(nhom(w, "LPH").active, 0);
  // gán vào nhóm tắt → 409
  const gan = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["LP1"], groupCode: "LPH" } });
  assert.equal(gan.status, 409, gan.text);
  assert.equal(hienHanh(w, "LP1"), undefined);
});

test("PUT /api/catalog/group-assignments: 51 mã → 400; nhóm lạ → 404; mã dịch vụ lạ → 404 (không ghi gì); mã đã đúng nhóm → bỏ qua; mỗi dịch vụ đổi một dòng nhật ký catalog_group_assigned", async () => {
  const w = setup();
  const r51 = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: Array.from({ length: 51 }, (_, i) => `TD${i}`), groupCode: "TTB" } });
  assert.equal(r51.status, 400, r51.text);
  for (const body of [{}, { codes: [], groupCode: "TTB" }, { codes: ["TTBSNO"] }, { codes: ["TTB SNO"], groupCode: "TTB" }, { codes: ["TTBSNO"], groupCode: "" }]) {
    const bad = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body });
    assert.equal(bad.status, 400, `${JSON.stringify(body)}: ${bad.text}`);
  }
  assert.equal((await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBSNO"], groupCode: "KHONGCO" } })).status, 404);
  const la = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBSNO", "KHONGCO"], groupCode: "TTB" } });
  assert.equal(la.status, 404, la.text);
  assert.equal(w.q("SELECT COUNT(*) AS n FROM ctl_service_group")[0].n, 0, "mã lạ: cả lô không ghi");
  // gán ba mã (một mã gửi trùng hai lần)
  const r = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBSNO", "TTBPC", "TDX1", "TTBSNO"], groupCode: "TTB" } });
  assert.equal(r.status, 200, r.text);
  assert.deepEqual(r.json, { doi: 3, boQua: 0 });
  let log = w.q("SELECT * FROM audit_log WHERE action = 'catalog_group_assigned' ORDER BY target_id");
  assert.equal(log.length, 3);
  assert.deepEqual(log.map((l: any) => l.target_id), ["TDX1", "TTBPC", "TTBSNO"]);
  for (const l of log) {
    assert.equal(l.target_type, "catalog");
    assert.equal(l.detail, "Chưa phân loại → Thể thao biển");
    assert.equal(l.staff_id, ADM);
    assert.equal(l.order_id, null);
    assert.doesNotMatch(l.detail, /\d{9,}|@/, "không SĐT, không email");
  }
  // chuyển một phần: mã đã đúng nhóm bỏ qua, không dòng mới, không nhật ký
  const r2 = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TDX1", "TDX2"], groupCode: "TDA" } });
  assert.deepEqual(r2.json, { doi: 2, boQua: 0 });
  const r3 = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TDX1", "TTBSNO"], groupCode: "TDA" } });
  assert.deepEqual(r3.json, { doi: 1, boQua: 1 });
  const r4 = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TDX1"], groupCode: "TDA" } });
  assert.deepEqual(r4.json, { doi: 0, boQua: 1 });
  assert.equal(w.q("SELECT COUNT(*) AS n FROM ctl_service_group WHERE service_code = 'TDX1'")[0].n, 2, "TDX1: gán TTB rồi TDA — lần bỏ qua không thêm dòng");
  assert.equal(hienHanh(w, "TDX1"), "TDA");
  assert.equal(hienHanh(w, "TTBSNO"), "TDA");
  log = w.q("SELECT detail FROM audit_log WHERE action = 'catalog_group_assigned' AND target_id = 'TTBSNO' ORDER BY created_at DESC, rowid DESC");
  assert.equal(log[0].detail, "Thể thao biển → Tour đảo");
  assert.equal(demNhatKy(w, "catalog_group_assigned"), 3 + 2 + 1);
  // về Chưa phân loại
  const r5 = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TDX2"], groupCode: null } });
  assert.deepEqual(r5.json, { doi: 1, boQua: 0 });
  assert.equal(hienHanh(w, "TDX2"), null);
  assert.equal(w.q("SELECT detail FROM audit_log WHERE action = 'catalog_group_assigned' AND target_id = 'TDX2' ORDER BY created_at DESC, rowid DESC LIMIT 1")[0].detail, "Tour đảo → Chưa phân loại");
  // lịch sử
  const ls = await w.call("GET", "/api/catalog/TDX2/group-history", { as: ADM });
  assert.equal(ls.status, 200, ls.text);
  assert.deepEqual(ls.json.items.map((i: any) => i.nhom), [null, "Tour đảo"], "mới nhất trước; null = Chưa phân loại");
  assert.deepEqual(Object.keys(ls.json.items[0]).sort(), ["createdBy", "luc", "nhom"]);
  assert.equal((await w.call("GET", "/api/catalog/KHONGCO/group-history", { as: ADM })).status, 404);
  assert.equal((await w.call("GET", "/api/catalog/LP1/group-history", { as: ADM })).json.items.length, 0);
});

test("Hai lô đua cùng một dịch vụ (cùng seq): lô sau bị CSDL chặn → 409, không ghi nửa chừng, không nhật ký thừa", async () => {
  const w = setup();
  // Mô phỏng đua: chèn tay dòng seq 1 cho TTBSNO SAU khi máy chủ đã đọc "chưa có dòng" — cách đơn giản: bọc prepare để chèn trước batch.
  const realBatch = w.env.DB.batch.bind(w.env.DB);
  let chen = true;
  w.env.DB.batch = async (stmts: any) => {
    if (chen) {
      chen = false;
      w.sqlite.exec(`INSERT INTO ctl_service_group (id, service_code, group_code, seq, valid_from_at, created_at, created_by, updated_at, updated_by)
        VALUES ('dua', 'TTBSNO', 'TDA', 1, '${NOW}', '${NOW}', NULL, '${NOW}', NULL)`);
    }
    return realBatch(stmts);
  };
  const r = await w.call("PUT", "/api/catalog/group-assignments", { as: ADM, body: { codes: ["TTBPC", "TTBSNO"], groupCode: "TTB" } });
  assert.equal(r.status, 409, r.text);
  assert.equal(hienHanh(w, "TTBPC"), undefined, "cả lô huỷ — TTBPC không được gán nửa chừng");
  assert.equal(demNhatKy(w, "catalog_group_assigned"), 0);
});
