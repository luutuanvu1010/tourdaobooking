// Nghiên cứu tốc độ 2026-10-02, đợt 1 việc 3: huy hiệu "Đơn hàng" trên thanh bên máy tính (số đơn CHƯA XÁC NHẬN) từng gọi nguyên `GET /api/orders/dashboard`
// (~15 câu D1, cả tuần đơn) ở MỌI trang chỉ để lấy `draftCount`. Nay có route đếm riêng `GET /api/orders/dem-nhap` (MỘT câu). Bài này ép: (1) AI được gọi dashboard
// thì được gọi route đếm và NGƯỢC LẠI (cùng ba ô quyền — không mở thêm cửa); (2) số trùng `draftCount` của dashboard; (3) không bị route `:id` nuốt.
// Chạy CẢ ứng dụng trên SQLite thật qua khung tests/audit/harness.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../../../tests/audit/harness.mjs";

const TAI_KHOAN: Record<string, { id: string; perms: string[] }> = {
  SALES: { id: "11111111-1111-4111-8111-111111111111", perms: ["SALES"] },
  ADMIN: { id: "33333333-3333-4333-8333-333333333333", perms: ["ADMIN"] },
  FIELD: { id: "44444444-4444-4444-8444-444444444444", perms: ["FIELD"] },
  ACCOUNTING: { id: "55555555-5555-4555-8555-555555555555", perms: ["ACCOUNTING"] },
  SUPER_ADMIN: { id: "77777777-7777-4777-8777-777777777777", perms: ["SUPER_ADMIN"] },
  PARTNER: { id: "88888888-8888-4888-8888-888888888888", perms: ["PARTNER"] },
  INTERN: { id: "99999999-9999-4999-8999-999999999999", perms: ["INTERN"] },
  HR: { id: "66666666-6666-4666-8666-666666666666", perms: ["HR"] },
  LAI: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", perms: ["FIELD", "PARTNER"] },
};

function setup() {
  const w = world();
  let n = 0;
  for (const [ten, t] of Object.entries(TAI_KHOAN)) seedStaff(w.sqlite, { id: t.id, phone: `09000001${String(n++).padStart(2, "0")}`, name: ten, perms: t.perms });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
const inDays = (n: number) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
async function taoDonNhap(w: any): Promise<void> {
  const departDate = inDays(3);
  const r = await w.call("POST", "/api/orders", {
    as: TAI_KHOAN.SALES!.id,
    body: { customerName: "Khách Thử", customerPhone: "0912345678", services: [{ kind: "catalog", catalogCode: "ZA1", pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 500000 }, departDate }] },
  });
  assert.equal(r.status, 201, r.text);
}

test("quyền: mọi loại tài khoản nhận CÙNG mã trạng thái ở route đếm và ở dashboard (không mở thêm cửa, không đóng bớt)", async () => {
  const w = setup();
  for (const [ten, t] of Object.entries(TAI_KHOAN)) {
    const dem = await w.call("GET", "/api/orders/dem-nhap", { as: t.id });
    const bang = await w.call("GET", "/api/orders/dashboard", { as: t.id });
    assert.equal(dem.status, bang.status, `${ten}: dem-nhap ${dem.status} ≠ dashboard ${bang.status}`);
  }
  // và ít nhất Bán hàng thấy, Đối tác / Thực tập không (đề phòng cả hai cùng sai một kiểu)
  assert.equal((await w.call("GET", "/api/orders/dem-nhap", { as: TAI_KHOAN.SALES!.id })).status, 200);
  assert.equal((await w.call("GET", "/api/orders/dem-nhap", { as: TAI_KHOAN.PARTNER!.id })).status, 403);
  assert.equal((await w.call("GET", "/api/orders/dem-nhap", { as: TAI_KHOAN.INTERN!.id })).status, 403);
  assert.equal((await w.call("GET", "/api/orders/dem-nhap")).status, 401);
});

test("số đơn nháp trùng `draftCount` của dashboard (0 rồi tăng theo từng đơn nháp mới); phản hồi chỉ có đúng khoá draftCount", async () => {
  const w = setup();
  const S = TAI_KHOAN.SALES!.id;
  assert.deepEqual((await w.call("GET", "/api/orders/dem-nhap", { as: S })).json, { draftCount: 0 });
  await taoDonNhap(w);
  await taoDonNhap(w);
  const dem = (await w.call("GET", "/api/orders/dem-nhap", { as: S })).json;
  const bang = (await w.call("GET", "/api/orders/dashboard", { as: S })).json;
  assert.deepEqual(Object.keys(dem), ["draftCount"]);
  assert.ok(bang.draftCount >= 2, "đơn mới lập phải là đơn nháp");
  assert.equal(dem.draftCount, bang.draftCount);
});

test("route đếm làm ÍT câu D1 hơn dashboard nhiều lần (đếm bằng bọc prepare) — chốt mục đích của việc 3", async () => {
  const w = setup();
  const S = TAI_KHOAN.SALES!.id;
  await w.token(S); // tạo phiên TRƯỚC khi đếm: bước dựng phiên thử của khung cũng đi qua prepare
  const goc = w.env.DB.prepare.bind(w.env.DB);
  let so = 0;
  w.env.DB.prepare = (sql: string) => { so++; return goc(sql); };
  await w.call("GET", "/api/orders/dem-nhap", { as: S });
  const demCau = so;
  so = 0;
  await w.call("GET", "/api/orders/dashboard", { as: S });
  const bangCau = so;
  assert.ok(demCau <= 4, `route đếm tốn ${demCau} câu (3 câu nền + 1 câu đếm)`);
  assert.ok(bangCau >= demCau + 3, `dashboard ${bangCau} câu so với route đếm ${demCau}`);
});
