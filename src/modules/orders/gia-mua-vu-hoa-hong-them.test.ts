// ADR-0229 Đ10 — bổ sung theo người kiểm độc lập 23/11 (N1, N2): (N1) giá đại lý Việc 6 của đơn mùa vụ ĐÃ SỬA SỐ KHÁCH sau xác nhận vẫn không tính hoa hồng trên phần tăng
// (nhánh tính lại `eff.recomputed` ở orders/gia-dai-ly.ts; sổ vàng H11); (N2) dòng ghi sổ lúc «Đã giao» (`dongThuongMaiTu` của billing, nguồn `phanThuongMaiCuaDon`) ra hoa hồng
// trên cơ sở đã bỏ phần tăng (tiêu chí 1b).
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
/** Đơn nháp 2 người lớn × 570.000 (500.000 + 70.000 mùa vụ) của đại lý C, như máy chủ ghi (Đ5). */
function nhap(w: W, id: string): string {
  w.sqlite.prepare(`INSERT INTO orders (id, order_code, staff_id, status, customer_name, customer_phone, subtotal, discount, total, remaining_amount, booker_party_id, created_at, updated_at)
    VALUES (?, ?, ?, 'draft', 'Khách Giả', '0900000099', 1140000, 0, 1140000, 1140000, 'pty-dla', ?, ?)`).run(id, `TD-${id.slice(-4)}`, SALES, AT, AT);
  w.sqlite.prepare(`INSERT INTO order_service (pickup_choice, id, order_id, sort_order, catalog_code, name, unit, pax_adult, depart_date) VALUES ('KHONG_DON', ?, ?, 0, 'ZA1', 'Tour đảo', 'perPax', 2, ?)`)
    .run(`${id}-s0`, id, vnHomNay());
  w.sqlite.prepare(`INSERT INTO order_item (id, order_id, service_id, catalog_code, pax_code, description, quantity, unit_price, catalog_price, line_total, base_price, seasonal_rule_id, seasonal_increase)
    VALUES (?, ?, ?, 'ZA1', 'adult', 'Người lớn', 2, 570000, 570000, 1140000, 500000, 'qt-mua', 70000)`).run(`${id}-i`, id, `${id}-s0`);
  return id;
}
const P = (adult: number) => ({ adult, child: 0, senior: 0, infant: 0 });

test("N1 (sổ vàng H11): đơn mùa vụ xác nhận 2 người lớn, sửa còn 1 ⇒ giá đại lý Việc 6: thành tiền 570.000, hoa hồng 10 % = 50.000 (không phải 57.000), giá đại lý 520.000", async () => {
  const w = setup();
  assert.equal((await w.call("POST", "/api/pricing/hoa-hong", { as: KT, body: { tuNgay: "2026-01-01", doiTuong: { loai: "VAI", code: "TRAVEL_AGENCY" }, phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 } })).status, 201);
  const id = nhap(w, "eeeeeeee-eeee-4eee-8eee-000000000001");
  assert.equal((await w.xacNhanDon(id, SALES)).status, 200);
  w.sqlite.prepare("INSERT INTO order_money_adjustment (id, order_id, seq, before_json, after_json, subtotal_before, subtotal_after) VALUES (?, ?, 1, ?, ?, 1140000, 570000)")
    .run("aaaaaaaa-0000-4000-8000-0000000000e1", id, JSON.stringify([{ serviceId: `${id}-s0`, pax: P(2) }]), JSON.stringify([{ serviceId: `${id}-s0`, pax: P(1) }]));
  const g = (await app.giaDaiLyNhieuDon(w.env.DB, [id])).get(id);
  assert.deepEqual(g.dong.map((d: { thanhTien: number; hoaHong: number; giaDaiLy: number }) => [d.thanhTien, d.hoaHong, d.giaDaiLy]), [[570000, 50000, 520000]]);
});
