// Nghiên cứu tốc độ 2026-10-02, đợt 1 việc 3: huy hiệu "Dịch vụ & giá" trên thanh bên (số dịch vụ LỆCH GIÁ Sheet) từng tải nguyên `GET /api/catalog/admin`
// (cả danh mục kèm giá, nhóm, trạng thái đồng bộ) ở MỌI trang của Quản trị chỉ để đếm. Nay có `GET /api/catalog/dem-xung-dot` trả MỘT con số, cùng cổng + cùng
// ô quyền (`admin.manage`) và cùng phép đếm (số dịch vụ có ít nhất một xung đột giá). Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const ADM = "33333333-3333-4333-8333-333333333333";
const HR = "66666666-6666-4666-8666-666666666666";
const SALES = "11111111-1111-4111-8111-111111111111";
const SUP = "77777777-7777-4777-8777-777777777777";

function setup() {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: HR, phone: "0900000006", name: "Nhân sự", perms: ["HR"] });
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  for (const [ma, gia] of [["ZA1", 500000], ["ZA2", 600000], ["ZA3", 700000]] as const) {
    w.sqlite.exec(`INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('${ma}', 'Tour ${ma}', 'perPax', ${gia}, 1, '2026-01-01', '2026-01-01')`);
  }
  return w;
}
const demXungDot = async (w: any, as?: string) => w.call("GET", "/api/catalog/dem-xung-dot", { as });

test("quyền: chỉ người giữ admin.manage (Quản trị, Toàn quyền); Bán hàng / Nhân sự 403; chưa đăng nhập 401 — cùng bộ mã với /api/catalog/admin", async () => {
  const w = setup();
  for (const [ten, id] of [["ADMIN", ADM], ["SUPER_ADMIN", SUP], ["SALES", SALES], ["HR", HR]] as const) {
    const a = await demXungDot(w, id);
    const b = await w.call("GET", "/api/catalog/admin", { as: id });
    assert.equal(a.status, b.status, `${ten}: dem-xung-dot ${a.status} ≠ admin ${b.status}`);
  }
  assert.equal((await demXungDot(w, SALES)).status, 403);
  assert.equal((await demXungDot(w)).status, 401);
  assert.equal((await demXungDot(w, ADM)).status, 200);
});

test("số trùng phép đếm của màn Danh mục (số dịch vụ có xung đột giá): 0 → 1 → 2 khi giá Sheet lệch giá nền của ghi đè", async () => {
  const w = setup();
  const doiChieu = async () => {
    const dem = (await demXungDot(w, ADM)).json;
    const bang = (await w.call("GET", "/api/catalog/admin", { as: ADM })).json;
    assert.deepEqual(Object.keys(dem), ["conflictCount"]);
    assert.equal(dem.conflictCount, bang.items.filter((i: any) => i.conflicts.length > 0).length);
    return dem.conflictCount as number;
  };
  assert.equal(await doiChieu(), 0);
  for (const ma of ["ZA1", "ZA2"]) {
    const r = await w.call("PATCH", `/api/catalog/${ma}`, { as: ADM, body: { prices: { adult: 400000 } } });
    assert.equal(r.status, 200, r.text);
  }
  assert.equal(await doiChieu(), 0, "vừa đặt ghi đè: giá nền = giá Sheet hiện tại");
  w.sqlite.exec("UPDATE catalog_item SET price_adult = 550000 WHERE code = 'ZA1'");
  assert.equal(await doiChieu(), 1);
  w.sqlite.exec("UPDATE catalog_item SET price_adult = 650000 WHERE code = 'ZA2'");
  assert.equal(await doiChieu(), 2);
});

test("route đếm làm ÍT câu D1 hơn /api/catalog/admin (đếm bằng bọc prepare)", async () => {
  const w = setup();
  await w.token(ADM); // tạo phiên TRƯỚC khi đếm: bước dựng phiên thử của khung cũng đi qua prepare
  const goc = w.env.DB.prepare.bind(w.env.DB);
  let so = 0;
  w.env.DB.prepare = (sql: string) => { so++; return goc(sql); };
  await demXungDot(w, ADM);
  const dem = so;
  so = 0;
  await w.call("GET", "/api/catalog/admin", { as: ADM });
  assert.ok(dem < so, `đếm ${dem} câu, admin ${so} câu`);
});
