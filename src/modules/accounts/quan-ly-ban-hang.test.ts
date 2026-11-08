// ADR-0169 Đ3 + Điều kiện nghiệm thu 1–4: chạy ROUTER THẬT trên SQLite dựng từ migrations (khung tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const QT = "0c000000-0000-4000-8000-000000000001";
const NS = "0c000000-0000-4000-8000-000000000002";
const BH = "0c000000-0000-4000-8000-000000000004";
const TQ = "0c000000-0000-4000-8000-000000000005";
const QL = "0c000000-0000-4000-8000-000000000006";
const LAI = "0c000000-0000-4000-8000-000000000007";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: QT, phone: "0902000001", name: "Quản Trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: NS, phone: "0902000002", name: "Nhân Sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: BH, phone: "0902000004", name: "Bán Hàng", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: TQ, phone: "0902000005", name: "Toàn Quyền", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: QL, phone: "0902000006", name: "Quản Lý", perms: ["SALES", "SALES_MANAGER"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0902000007", name: "Lai", perms: ["SALES", "SALES_MANAGER", "PARTNER"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZQ1', 'Vé buffet', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const VAI = (roles: string[], adds: string[] = []) => ({ roles, adds, removes: [], reason: adds.length ? "thử" : undefined });
const veThu = (w: any): string => (w.q("SELECT code FROM catalog_item WHERE in_sheet = 1 LIMIT 1")[0] as { code: string }).code;

test("Đ3: Nhân sự tạo tài khoản mang vai → 403, không tạo; quyền cũ không vai cũng 403", async () => {
  const w = setup();
  const r = await w.call("POST", "/api/staff", { as: NS, body: { fullName: "Mới Một", phone: "0902000011", pin: "246813", taoHoSoMoi: true, ...VAI(["SALES_MANAGER"]) } });
  assert.equal(r.status, 403);
  assert.equal(w.q("SELECT count(*) AS n FROM staff WHERE phone = '0902000011'")[0].n, 0);
  const r2 = await w.call("POST", "/api/staff", { as: NS, body: { fullName: "Mới Hai", phone: "0902000012", pin: "246813", taoHoSoMoi: true, permissions: ["SALES", "SALES_MANAGER"] } });
  assert.equal(r2.status, 403);
});

test("Đ1, nghiệm thu 2: Quản lý đổi được cờ, Bán hàng không; Quản lý không đổi công tắc tự kiểm, kể cả thân lẫn", async () => {
  const w = setup();
  const ma = veThu(w);
  const dat = (as: string, body: unknown) => w.call("POST", "/api/cai-dat/xac-nhan-don", { as, body });
  assert.equal((await dat(BH, { pham: "SERVICE", ma, canXacNhan: true })).status, 403, "Bán hàng");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_service_confirm_flag")[0].n, 0);
  assert.equal((await dat(QL, { pham: "SERVICE", ma, canXacNhan: true })).status, 200, "Quản lý");
  assert.equal((await dat(QT, { pham: "SERVICE", ma, canXacNhan: false })).status, 200, "Quản trị");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_service_confirm_flag")[0].n, 2);
  assert.equal((await dat(QL, { tuXacNhanNoiBo: false })).status, 403, "công tắc");
  assert.equal((await dat(QT, { tuXacNhanNoiBo: false })).status, 403, "Quản trị không đổi công tắc");
  assert.equal((await dat(QL, { tuXacNhanNoiBo: false, pham: "SERVICE", ma, canXacNhan: true })).status, 403, "thân lẫn");
  assert.equal(w.q("SELECT count(*) AS n FROM ord_service_confirm_flag")[0].n, 2, "thân lẫn không ghi nửa chừng");
  assert.equal((await dat(TQ, { tuXacNhanNoiBo: false })).status, 200, "Toàn quyền");
  assert.equal((await w.call("GET", "/api/cai-dat/xac-nhan-don", { as: QL })).status, 200);
  assert.equal((await w.call("GET", "/api/cai-dat/xac-nhan-don", { as: BH })).status, 403);
});

test("Đ5, nghiệm thu 2, 4: màn hẹp không có giá; Ngừng bán, Mở bán lại ghi nhật ký; Quản lý không vào tuyến giá", async () => {
  const w = setup();
  const ma = veThu(w);
  const r = await w.call("GET", "/api/catalog/quan-ly-ban", { as: QL });
  assert.equal(r.status, 200);
  const chuoi = JSON.stringify(r.json);
  for (const cam of ["price", "prices", "gia", "override", "supply", "adult"]) assert.equal(chuoi.includes(`"${cam}`), false, `lộ ${cam}`);
  assert.deepEqual(Object.keys(r.json.dichVu[0]).sort(), ["code", "dangBan", "groupCode", "ten"]);

  const ban = (as: string, ngungBan: unknown) => w.call("PUT", `/api/catalog/${ma}/ngung-ban`, { as, body: { ngungBan } });
  assert.equal((await ban(BH, true)).status, 403, "Bán hàng");
  assert.equal((await ban(QL, "x")).status, 400);
  assert.equal((await ban(QL, true)).status, 200);
  assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as: QL })).json.dichVu.find((d: any) => d.code === ma).dangBan, false);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'catalog_hidden'")[0].n, 1);
  assert.equal((await ban(QL, true)).status, 200, "gửi lại");
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'catalog_hidden'")[0].n, 1, "gửi lại không ghi thêm");
  assert.equal((await ban(QL, false)).status, 200);
  assert.equal(w.q("SELECT count(*) AS n FROM audit_log WHERE action = 'catalog_unhidden'")[0].n, 1);

  assert.equal((await w.call("GET", "/api/catalog/admin", { as: QL })).status, 403);
  assert.equal((await w.call("PATCH", `/api/catalog/${ma}`, { as: QL, body: { hidden: true } })).status, 403);
  // ADR-0186 (chủ duyệt 8/11): Quản lý bán hàng được «Đồng bộ ngay từ Google Sheet» — qua cổng, tới bước đọc Sheet (khung thử không khai Sheet nên 424).
  const dongBo = await w.call("POST", "/api/catalog/sync", { as: QL, body: {} });
  assert.notEqual(dongBo.status, 403, "Quản lý bán hàng không bị cổng quyền chặn ở tuyến đồng bộ");
  assert.notEqual(dongBo.json?.error?.code, "forbidden");
  assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as: BH })).status, 403);
  assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as: QT })).status, 200);
});

test("nghiệm thu 3: tài khoản giữ Đối tác nhận 403 ở cả ba tuyến", async () => {
  const w = setup();
  const ma = veThu(w);
  assert.equal((await w.call("GET", "/api/catalog/quan-ly-ban", { as: LAI })).status, 403);
  assert.equal((await w.call("PUT", `/api/catalog/${ma}/ngung-ban`, { as: LAI, body: { ngungBan: true } })).status, 403);
  assert.equal((await w.call("POST", "/api/cai-dat/xac-nhan-don", { as: LAI, body: { pham: "SERVICE", ma, canXacNhan: true } })).status, 403);
  assert.equal((await w.call("GET", "/api/cai-dat/xac-nhan-don", { as: LAI })).status, 403);
});

test("cổng office không mở cho mã mới đứng một mình: không Danh bạ, không đơn; cũng không vào được hai tuyến hẹp", async () => {
  const w = setup();
  const LE = "0c000000-0000-4000-8000-000000000008";
  seedStaff(w.sqlite, { id: LE, phone: "0902000008", name: "Chỉ Mã Mới", perms: ["SALES_MANAGER"] });
  for (const duong of ["/api/parties", "/api/orders", "/api/catalog/quan-ly-ban", "/api/cai-dat/xac-nhan-don"]) assert.equal((await w.call("GET", duong, { as: LE })).status, 403, duong);
});
