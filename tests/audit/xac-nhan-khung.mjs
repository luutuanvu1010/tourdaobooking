// Khung dựng thế giới thử cho các bài của bước xác nhận đơn (ADR-0136, Task 3.3): nhân viên mẫu, hai dịch vụ danh mục, đánh dấu cờ «cần xác nhận» thẳng CSDL, lập đơn nháp.
// Chỉ là trợ giúp của bài kiểm (không phải bài); mã sản phẩm không import tệp này.
import assert from "node:assert/strict";
import { world, seedStaff } from "./harness.mjs";

export const A = "11111111-1111-4111-8111-111111111111"; // Bán hàng — người lập
export const B = "11111111-1111-4111-8111-222222222222"; // Bán hàng khác
export const ADM = "33333333-3333-4333-8333-333333333333";
export const H = "44444444-4444-4444-8444-444444444444"; // hướng dẫn viên
export const LAI = "66666666-6666-4666-8666-666666666666"; // tài khoản lai Bán hàng + Đối tác
export const ACC = "55555555-5555-4555-8555-555555555555";
export const SUP = "77777777-7777-4777-8777-777777777777";
export const PARTNER = "88888888-8888-4888-8888-888888888888";
export const INTERN = "99999999-9999-4999-8999-999999999999";
export const LOC = "a941dd7d-faab-4098-9ab9-1df7fa6dd551";
export const inDays = (n) => new Date(Date.now() + 7 * 3600e3 + n * 86400e3).toISOString().slice(0, 10);
export const vnSau = (phut) => {
  const iso = new Date(Date.now() + 7 * 3600e3 + phut * 60_000).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
};

export function setup(tuyChon = {}) {
  const w = world(tuyChon);
  seedStaff(w.sqlite, { id: A, phone: "0900000001", name: "An", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: B, phone: "0900000002", name: "Bình", perms: ["SALES"] });
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: H, phone: "0900000004", name: "Hướng Dẫn", perms: ["FIELD"] });
  seedStaff(w.sqlite, { id: LAI, phone: "0900000006", name: "Lai", perms: ["SALES", "PARTNER"] });
  seedStaff(w.sqlite, { id: ACC, phone: "0900000005", name: "Kế toán", perms: ["ACCOUNTING"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  seedStaff(w.sqlite, { id: PARTNER, phone: "0900000008", name: "Đối tác", perms: ["PARTNER"] });
  seedStaff(w.sqlite, { id: INTERN, phone: "0900000009", name: "Thực tập", perms: ["INTERN"] });
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZA1', 'Tour đảo', 'perPax', 500000, 1, '2026-01-01', '2026-01-01')");
  w.sqlite.exec("INSERT INTO catalog_item (code, name, unit, price_adult, in_sheet, first_seen_at, updated_at) VALUES ('ZB1', 'Tour thường', 'perPax', 300000, 1, '2026-01-01', '2026-01-01')");
  return w;
}
/** Đánh dấu «cần xác nhận» thẳng CSDL (route cài đặt có bài riêng ở xac-nhan-cai-dat.test.ts). */
export function datCo(w, pham, ma, can, luc = new Date(Date.now() - 1000).toISOString()) {
  w.sqlite.prepare("INSERT INTO ord_service_confirm_flag (id, scope, code, required, valid_from_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)").run(crypto.randomUUID(), pham, ma, can ? 1 : 0, luc, luc, luc);
}
export const svc = (ma, departDate, legs = [], extra = {}) =>
  ({ kind: "catalog", pickupChoice: legs.length > 0 ? "DON" : "KHONG_DON", catalogCode: ma, pax: { adult: 2, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: ma === "ZA1" ? 500000 : 300000 }, departDate, legs, ...extra });
export const leg = (date, time) =>
  ({ direction: "OUT", pickupDate: date, pickupTime: time, pickupLocationId: null, pickupPlace: "Khách sạn Dò Tìm", dropoffLocationId: LOC, dropoffPlace: "" });
export async function lap(w, as, services = [svc("ZA1", inDays(3))], extra = {}) {
  const r = await w.call("POST", "/api/orders", { as, body: { customerName: "Khách Thử", customerPhone: "0912345678", services, ...extra } });
  assert.equal(r.status, 201, r.text);
  return r.json.order;
}
