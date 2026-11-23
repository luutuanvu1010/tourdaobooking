// ADR-0229 Đ10 (chủ 21/11, câu 10a: «Đại lý không hưởng hoa hồng trên phần tăng giá mùa vụ») qua ứng dụng THẬT: hoa hồng theo TỶ LỆ tính trên thành tiền TRỪ phần tăng mùa vụ ở
// phần thương mại (cũng là nguồn của «Đã giao» — billing đọc `phanThuongMaiCuaDon`), giá đại lý của Việc 6 (`giaDaiLyNhieuDon`), và trần giảm giá theo hoa hồng (`donChoTran`).
// Tiêu chí 1b của ADR, số theo sổ vàng H2 (với giá gốc 500.000 của khung thử: 2 × (570.000 − 70.000) × 10 % = 100.000).
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world, seedStaff } from "../../../tests/audit/harness.mjs";

const SALES = "11111111-1111-4111-8111-111111111111";
const KT = "44444444-4444-4444-8444-444444444444";
const AT = "2026-10-01T00:00:00.000Z";
const vnHomNay = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
type W = any; // eslint-disable-line @typescript-eslint/no-explicit-any

function setup(): W {
  const w = world();
  seedStaff(w.sqlite, { id: SALES, phone: "0900000001", name: "An Bán", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: KT, phone: "0900000004", name: "Lan Kế Toán", perms: ["ACCOUNTING"] });
  w.sqlite.prepare("INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('pty-dla', 'ORGANIZATION', 'Đại lý C', 1, ?, ?)").run(AT, AT);
  w.sqlite.prepare("INSERT INTO pty_party_role (id, party_id, role_type_code, valid_from_date, created_at, updated_at) VALUES ('r-dla', 'pty-dla', 'TRAVEL_AGENCY', '2026-01-01', ?, ?)").run(AT, AT);
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
/** Đơn NHÁP 2 người lớn ZA1 của đại lý C, dòng tiền mang bản chụp mùa vụ như máy chủ ghi (Đ5): đơn giá 570.000 = 500.000 + 70.000. `tang` = 0 ⇒ đơn không mùa vụ. */
function nhap(w: W, id: string, tang: number, giamGia = 0): string {
  const don = 500000 + tang, tien = 2 * don;
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', ?, ?, ?, ?, 'pty-dla', ?, ?)`).run(id, `TD-${id.slice(-4)}`, SALES, tien, giamGia, tien - giamGia, tien - giamGia, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 2, ?)`)
    .run(`${id}-s0`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total, base_price, seasonal_rule_id, seasonal_increase)
    VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 2, ?, ?, ?, 500000, ?, ?)`).run(`${id}-i`, id, `${id}-s0`, don, don, tien, tang ? "qt-mua" : null, tang);
  return id;
}
const mucDaiLy10 = (w: W) =>
  w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } });

test("tiêu chí 1b: mùa vụ 2 × 570.000 — hoa hồng 10 % = 100.000 (không phải 114.000), giá đại lý 1.040.000 ở phần thương mại và giá đại lý Việc 6; đơn không mùa vụ như cũ", async () => {
  const w = setup();
  assert.equal((await mucDaiLy10(w)).status, 201);
  const mua = nhap(w, "dddddddd-dddd-4ddd-8ddd-000000000001", 70000);
  const thuong = nhap(w, "dddddddd-dddd-4ddd-8ddd-000000000002", 0);
  for (const id of [mua, thuong]) {
    const r = await w.xacNhanDon(id, SALES);
    assert.equal(r.status, 200, r.text);
  }
  const vp = (await w.call("GET", `/api/orders/${mua}/thuong-mai`, { as: KT })).json.vanPhong;
  assert.deepEqual({ thanhTien: vp.dong[0].thanhTien, coSo: vp.dong[0].coSoHoaHong, hoaHong: vp.dong[0].hoaHong, giaDaiLy: vp.dong[0].giaDaiLy }, { thanhTien: 1140000, coSo: 1000000, hoaHong: 100000, giaDaiLy: 1040000 });
  const vp0 = (await w.call("GET", `/api/orders/${thuong}/thuong-mai`, { as: KT })).json.vanPhong;
  assert.equal(vp0.dong[0].hoaHong, 100000);
  assert.equal(vp0.dong[0].giaDaiLy, 900000);
  const gdl = await app.giaDaiLyNhieuDon(w.env.DB, [mua, thuong]);
  assert.deepEqual(gdl.get(mua)!.dong.map((d: { thanhTien: number; hoaHong: number; giaDaiLy: number }) => [d.thanhTien, d.hoaHong, d.giaDaiLy]), [[1140000, 100000, 1040000]]);
  assert.deepEqual(gdl.get(thuong)!.dong.map((d: { thanhTien: number; hoaHong: number; giaDaiLy: number }) => [d.thanhTien, d.hoaHong, d.giaDaiLy]), [[1000000, 100000, 900000]]);
});

test("tiêu chí 1b (trần): đơn mùa vụ có người hưởng — giảm giá 110.000 vượt trần 100.000 (hoa hồng không tính phần tăng) ⇒ không xác nhận được; 100.000 ⇒ được", async () => {
  const w = setup();
  assert.equal((await mucDaiLy10(w)).status, 201);
  const vuot = nhap(w, "dddddddd-dddd-4ddd-8ddd-000000000003", 70000, 110000);
  const r = await w.xacNhanDon(vuot, SALES);
  assert.equal(r.status, 400, r.text);
  assert.equal(r.json.error.code, "discount_exceeds_commission");
  assert.match(r.text, /100\.000/);
  const dung = nhap(w, "dddddddd-dddd-4ddd-8ddd-000000000004", 70000, 100000);
  const r2 = await w.xacNhanDon(dung, SALES);
  assert.equal(r2.status, 200, r2.text);
});
